import * as fs from 'fs/promises';
import {FileHandle} from "fs/promises";

class Day1 {
    part1(line: string) : number {
        let num1 : number | undefined
        let numLast : number | undefined
        const chars = line.split("")
        function assign(n: string | number) {
            if (num1 === undefined) {
                num1 = Number(n)
            } else {
                numLast = Number(n)
            }
        }
        for (let i = 0; i < chars.length;i++) {
            if ("0" <= chars[i] && chars[i] <= "9") {
                assign(chars[i])
            }
        }
        return num1 ? num1 * 10 + (numLast ? numLast : num1) : 0
    }

    numbers = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]
    part2(line: string) {
        let num1 : number | undefined
        let numLast : number | undefined
        const chars = line.split("")
        function assign(n: string | number) {
            if (num1 === undefined) {
                num1 = Number(n)
            } else {
                numLast = Number(n)
            }
            return false
        }
        for (let i = 0; i < chars.length;i++) {
            if ("0" <= chars[i] && chars[i] <= "9") {
                assign(chars[i])
            } else {
                for(let x = 0; x < this.numbers.length; x++) {
                    if (line.substring(i,i+this.numbers[x].length) == this.numbers[x]) {
                        assign(x)
                        break;
                    }
                }
            }
        }
        return num1 ? num1 * 10 + (numLast ? numLast : num1) : 0
    }

    async all(file: FileHandle, part : (x:string) => number) {
        let accum = 0
        for await (const line of file.readLines()) {
            const result = part(line)
            //console.log(line + " ==> " + result)
            accum += result
        }
        return accum
    }

    async do(path: string,f : (x:string) => number) {
        let lines = await fs.open(path, 'r')
        return await this.all(lines, f)
    }

    async main() {
        let accum1 = await this.do("data/Day1/input.txt", (l) => this.part1(l))
        console.log(accum1)
        let accum2 = await this.do("data/Day1/input.txt", (l) => this.part2(l))
        console.log(accum2)
    }
}

new Day1().main().then(() => console.log("Done"))
