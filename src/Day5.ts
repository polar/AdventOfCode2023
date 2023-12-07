import * as fs from "fs/promises";

class Range {
    constructor(public destination : number, public source: number, public length: number) {}

    getDest(source: number) {
        let x = source - this.source + this.destination
        return this.destination <= x && x < this.destination + this.length ? x : undefined
    }
}

class DestSourceMap {
    constructor(public ranges: Range[]) {}

    getDestBySource(source: number) {
        for(const range of this.ranges) {
            let dest = range.getDest(source)
            if (dest !== undefined)
                return dest
        }
        return source
    }
}

class Island {
    seeds: number[] = []
    ranges: DestSourceMap[] = []

    constructor(seeds: number[], ranges: DestSourceMap[]) {
        this.seeds = seeds
        this.ranges = ranges;
    }

    getDestBySource(source: number) {
        let result = this.ranges.reduce(
            (a,r) => [r.getDestBySource(a[0])].concat(a),
            [source]
        )
        return result[0]
    }
    
    getSeedsAsIntervals() : Interval[] {
        let intervals : Interval[] = []
        for(let i = 0 ; i < this.seeds.length; i += 2) {
            const start = this.seeds[i];
            const count = this.seeds[i + 1];
            const interval = new Interval(start, count);
            intervals.push(interval)
        }
        return intervals
    }
        
}

class Interval {
    min? : number;

    constructor(public start: number, public count: number) {}

    get id() {
        return `${this.start}-${this.count}`
    }

    split(max: number) : Interval[] {
        if (this.count <= max) {
            return [this]
        }
        return [new Interval(this.start, max)]
            .concat(new Interval(this.start + max, this.count - max).split(max))
    }
}


class IslandFactory {

    static parseSeeds(lines: string[]) {
        let seeds = lines[0].split(/ +/)
        lines.shift() // seeds: .....
        lines.shift() // <blank line>
        return seeds.slice(1)
    }

    static parseMapLine(line: string) {
        const lineArray = line.split(" ")
        if (lineArray.length != 3) {
            return undefined
        }
        const destination = parseInt(lineArray[0]);
        const source = parseInt(lineArray[1]);
        const length = parseInt(lineArray[2]);
        return new Range(destination, source, length);
    }

    static parseMap(lines: string[]) {
        let ranges : Range[] = []
        while(lines.length > 0 && lines[0]) {
            let range = this.parseMapLine(lines[0])
            lines.shift()
            if (range === undefined)
                return new DestSourceMap(ranges)
            ranges.push(range)
        }
        return new DestSourceMap(ranges)
    }

    static parseMaps(lines: string[]) {
        let maps : DestSourceMap[] = []
        while(lines[0]) {
            lines.shift() // xxx-t-xxx map:
            let map = this.parseMap(lines)
            maps.push(map)
            lines.shift()
        }
        return maps
    }

    static async parse(path: string) {
        let fh = await fs.open(path, "r")
        let  lines : string[] = []
        for await(const line of fh.readLines()) {
            lines.push(line)
        }

        let seeds = this.parseSeeds(lines).map(x => parseInt(x))
        let maps = this.parseMaps(lines)
        return new Island(seeds, maps)
    }
}

type WorkerRequest = {interval: string, start: number, count: number}
type WorkerResult = {interval: string, min: number}

class ConcurrentIntervalProcessor {

    static async createConcurrentProcessor(path: string) {
        return new ConcurrentIntervalProcessor(await IslandFactory.parse(path))
    }

    cluster : any
    os: any
    intervals = new Map<string,Interval>()

    constructor(public island: Island) {
        this.cluster = require('cluster')
        this.os = require('os')
    }

    private processResult(message: WorkerResult, done: any) {
        console.log(`Answer arrived ${message.interval} ${JSON.stringify(message)}`)
        if (message.interval && message.min) {
            let interval = this.intervals.get(message.interval)
            if (interval) {
                interval.min = message.min
            }
        }
        this.checkResults(done);
    }

    private checkResults(done: any) {
        let intervals = Array.from(this.intervals.values())
        if (intervals.every(i => i.min !== undefined)) {
            let mins = intervals.map(x => ({interval: x.id, min: x.min!}))
            console.log(`The answers are ${JSON.stringify(mins)}`)
            console.log(`The answer is ${Math.min(...mins.map(x => x.min))}`)
            done()
        } else {
            let missing = intervals.filter(x => x.min === undefined)
            console.log(`Missing intervals ${missing.map(x => x.id)}`)
        }
    }

    initPrimary(done: any) {
        this.cluster.on('message', (worker: any, message : WorkerResult) => {
            this.processResult(message, done);
        });
    }

    processWorkerRequest(message: WorkerRequest) {
        if (message.interval && message.start && message.count) {
            let interval = new Interval(message.start, message.count)
            let min = Main.part2D(this.island!, message.start, message.count)
            console.log(`Worker ${this.cluster.worker.id} sending answer ${interval.id} ${min}`)
            let result : WorkerResult = {interval: interval.id, min: min}
            this.cluster.worker.send(result)
            process.exit(0)
        }
    }

    initWorker() {
        this.cluster.worker.on('message', (message:  WorkerRequest) => {
            this.processWorkerRequest(message);
        })
    }


    setIntervalsFromIslandSeeds() {
        for (let interval of this.island.getSeedsAsIntervals()) {
            this.intervals.set(interval.id, interval)
        }
    }

    distributeIntervals(intervals : Interval[], max : number) : Interval[] {
        return intervals.reduce((a: Interval[],i) => a.concat(i.split(max)), [])
    }

    resetIntervalsForMaxCount(max: number) {
        let intervals = this.island.getSeedsAsIntervals()
        intervals = this.distributeIntervals(intervals, max);
        for(let interval of intervals) {
            this.intervals.set(interval.id, interval)
        }
    }

    sendWorkerRequest(interval: Interval, worker: any) {
        let msg : WorkerRequest = {interval: interval.id, start: interval.start, count: interval.count}
        worker.send(msg)
    }

    forkWorkersForIntervals() {
        let self = this
        for(let interval of this.intervals.values()) {
            let worker = this.cluster.fork()
            setTimeout(() => {
                self.sendWorkerRequest(interval, worker);
            },10000)
        }
    }

    runCluster(done: any) {
        this.cluster = require('cluster')
        if (this.cluster.isPrimary) {
            this.initPrimary(done)
            this.forkWorkersForIntervals()
        } else if (this.cluster.isWorker) {
            this.initWorker()
        }
    }

    runProcPerInterval(done: any) {
        this.setIntervalsFromIslandSeeds();
        this.runCluster(done)
    }

    runForNumberOfProcs(procs: number, done: any) {
        let length = Array.from(this.island.getSeedsAsIntervals()).reduce((a,c) => a + c.count, 0)
        let max = Math.ceil(length/procs)
        this.resetIntervalsForMaxCount(max)
        this.runCluster(done)
    }
}

class Main {

    static async part1(path: string) {
        let island = await IslandFactory.parse(path)
        let ans = island.seeds.map(x => island.getDestBySource(x))
        return Math.min(...ans)
    }

    static async part2A(path: string) {
        let island = await IslandFactory.parse(path)
        let min = Number.MAX_SAFE_INTEGER
        for(let i = 0; i < island.seeds.length; i += 2) {
            for (let x = island.seeds[i], j = 0; j < island.seeds[i + 1]; j++, x++) {
                let ans = island.getDestBySource(x)
                min = Math.min(min, ans)
            }
            console.log({i: i, start: island.seeds[i], length: island.seeds[i+1], min: min})
        }
        return min
    }

    static part2D(island: Island, start: number, count: number) {
        let min = Number.MAX_SAFE_INTEGER
        for (let x = start, j = 0; j < count; j++, x++) {
            let ans = island.getDestBySource(x)
            min = Math.min(min, ans)
        }
        return min
    }

    static async main1(path: string) {
        let result = await this.part1(path)
        console.log(result)
        return result
    }

    static async main2(path: string, done: any) {
        let processor = await ConcurrentIntervalProcessor.createConcurrentProcessor(path)
        processor.runProcPerInterval(done)
    }

    static async main3(path: string, done: any) {
        let processor = await ConcurrentIntervalProcessor.createConcurrentProcessor(path)
        processor.runForNumberOfProcs(processor.os.cpus().length, done)
    }

}

//Main.main1("data/Day5/input.txt").then(() => console.log("Done"))

function done() {
    console.timeEnd("execute")
    console.log(`Processing Complete`)
    process.exit(0)
}

console.time("execute")
// 12:14 minutes
// Main.main2("data/Day5/input.txt", done).then(() => {})

// 4:04 minutes
Main.main3("data/Day5/input.txt", done).then(() => {})
