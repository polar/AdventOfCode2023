import fs from "fs/promises";

class Card {
    card: number
    own: number[]
    wining: number[]

    constructor(line: string) {
        let parts = line.split(/[:|]/)
        this.wining = parts[1].trim().split(/ +/).map(x => Number(x))
        this.own = parts[2].trim().split(/ +/).map(x => Number(x))
        this.card = Number(parts[0].trim().split(/ +/)[1])
    }

    matches() {
        return this.own.filter(x => this.wining.some(y => x == y))
    }

    score() {
        let matches = this.matches()
        return matches.length == 0 ? 0 : Math.pow(2, matches.length-1)
    }
}

class Day4 {

    async getCards(path: string) {
        let file = await fs.open(path, "r")
        let cards : Card[] = []
        for await(const line of file.readLines()) {
            let cur = new Card(line)
            cards.push(new Card(line))
        }
        return cards
    }

    collectCards1(index : number, cards: Card[]) : Card[] {
        let nMatches = cards[index].matches().length
        let newCards = cards.slice(index+1, index+1 + nMatches)
        let results = newCards.map((x,i) => this.collectCards1(index+1 + i, cards))
        return results.reduce((a,c) => a.concat(c), [cards[index]])
    }

    collectCards(cards: Card[]) : Card[] {
        let results = cards.map((c,i) => this.collectCards1(i, cards))
        return results.reduce((a,c) => a.concat(c), [])
    }

    async part1(path: string) {
        let cards = await this.getCards(path)
        let scores = cards.map(x => x.score())
        return cards.reduce((a,c) => a + c.score(), 0)
    }

    async part2(path: string) {
        let cards = await this.getCards(path)
        let allCards = this.collectCards(cards)
        return allCards.length
    }

    async main(path: string) {
        let ans1 = await this.part1(path)
        console.log(ans1)
        let ans2 = await this.part2(path)
        console.log(ans2)
    }
}

new Day4().main("data/Day4/input.txt").then(() => console.log("Done"))
