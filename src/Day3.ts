import * as fs from 'fs/promises';

class Num {
    start = 0
    end = 0
    value = 0

    constructor(start: number, value: string) {
        this.start = start
        this.end = start + value.length - 1
        this.value = Number(value)
    }
}

class Sym {
    sym : string
    index : number

    constructor(sym : string, index : number) {
        this.sym = sym
        this.index = index
    }

    isAdjacent(n: Num) {
        return n.start-1 <= this.index && this.index <= n.end+1
    }
}

class Line {
    index : number
    numbers : Num[] = []
    symbols: Sym[] = []
    prev? : Line
    next? : Line

    constructor(index: number, numbers: Num[], syms: Sym[]) {
        this.index = index
        this.numbers = numbers
        this.symbols = syms
    }

    partNumbers() {
        return this.numbers.filter(n =>
            this.prev?.symbols.some(s => s.isAdjacent(n))
            || this.symbols.some(s => s.isAdjacent(n))
            || this.next?.symbols.some(s => s.isAdjacent(n)))
    }

    gearRatios() : number[] {
        let stars = this.symbols.filter(s => s.sym === "*")
        let ratios : number[] = []
        for(let star of stars) {
            let adjacent = this.prev?.numbers!.filter(n => star.isAdjacent(n)) || []
            adjacent = adjacent.concat( this.numbers.filter(n => star.isAdjacent(n)))
            adjacent = adjacent.concat( this.next?.numbers!.filter(n => star.isAdjacent(n)) || [])
            if (adjacent.length > 1)
                ratios.push(adjacent.reduce((a,c) => a * c.value, 1))
        }
        return ratios
    }

    static parse(index: number, line: string) {
        let numbers: Num[] = []
        let symbols: Sym[] = []
        let chars = line.split("")
        let num = ""
        for(let i = 0; i < chars.length; i++) {
            if ("0" <= chars[i] && chars[i] <= "9") {
                num = num.concat(chars[i])
            } else {
                if (num !== "") {
                    let end = i-1
                    let start = end - num.length + 1
                    numbers.push(new Num(start, num))
                    num = ""
                }
                if (chars[i] !== ".") {
                    symbols.push(new Sym(chars[i], i))
                }
            }
        }
        if (num !== "") {
            let end = chars.length-1
            let start = end - num.length + 1
            numbers.push(new Num(start, num))
        }
        return new Line(index, numbers, symbols)
    }
}

class Day3 {

    async getLines(path: string) {
        let file = await fs.open(path, "r")
        let lines : Line[] = []
        let last : Line | undefined = undefined
        let index = 0
        for await(const line of file.readLines()) {
            let cur = Line.parse(index++, line)
            cur.prev = last
            if (last !== undefined) last.next = cur
            lines.push(cur)
            last = cur
        }
        return lines
    }

    getPartNumbers(lines: Line[]) : Num[] {
        return lines.reduce((a: Num[],ps) => a.concat(ps.partNumbers()),[])
    }

    getGearRatios(lines: Line[]) : number[] {
        return lines.reduce((a: number[],ps) => a.concat(ps.gearRatios()),[])
    }

    async part1(path: string) {
        let lines = await this.getLines(path)
        let nums = this.getPartNumbers(lines)
        let sum = nums.reduce((a,n) => a + n.value, 0)
        console.log(nums.map(n => n.value))
        return sum
    }

    async part2(path: string) {
        let lines = await this.getLines(path)
        let gearsRatios = this.getGearRatios(lines)
        let sum = gearsRatios.reduce((a,c) => a + c, 0)
        return sum

    }
    async main(path: string) {
        let ans1 = await this.part1(path)
        console.log(ans1)
        let ans2 = await this.part2(path)
        console.log(ans2)
    }

}

new Day3().main("data/Day3/input.txt").then(() => console.log("Done"))
