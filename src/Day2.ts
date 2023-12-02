import * as fs from 'fs/promises';

type Handful = {red: number, blue: number, green: number}
type Game = {game: number, handfuls: Handful[]}

class Day2 {
    parseHandful(line: String) : Handful {
        let cubeCount = line.split(",")
        let handful: Handful = {red: 0, blue: 0, green: 0}
        for (let cubes of cubeCount) {
            let parts = cubes.trim().split(" ")
            let color = parts[1]
            let count = parts[0]
            handful[color as keyof Handful] += Number(count)
        }
        return handful
    }

    parseHandfuls(line: string) : Handful[] {
        let games = line.split(";")
        return games.map((x) => this.parseHandful(x))
    }

    parseGame(line: string): Game {
        let game= line.split(":")
        return {game: Number(game[0].split(" ")[1]), handfuls: this.parseHandfuls(game[1])}
    }

    selectPossibleGamesFor(games : Game[], red :number, blue: number, green: number) {
        return games.filter((g) =>
            g.handfuls.every((h) =>
                h.red <= red && h.blue <= blue && h.green <= green))
    }

    calcMinimumGames(games: Game[]) : Game[] {
        return games.map((g: Game) => ({
                game: g.game,
                handfuls: [{
                    red: Math.max(...g.handfuls.map(h => h.red)),
                    blue: Math.max(...g.handfuls.map(h => h.blue)),
                    green: Math.max(...g.handfuls.map(h => h.green))
                }]
        }))
    }

    async getGames(path: string) {
        let file = await fs.open(path, "r")
        let games : Game[] = []
        for await(const line of file.readLines()) {
            games.push(this.parseGame(line))
        }
        return games
    }

    async part1(path: string, red: number, blue: number, green: number) {
        let games = await this.getGames(path)
        let selected = this.selectPossibleGamesFor(games, red, blue, green)
        return selected.reduce((a,g) => a + g.game, 0)
    }

    power(handful : Handful) {
        return handful.red * handful.blue * handful.green
    }

    async part2(path: string) {
        let games = await this.getGames(path)
        let minGames = this.calcMinimumGames(games)
        let powers = minGames.map(g => this.power(g.handfuls[0]))
        return powers.reduce((a,p) => a + p, 0)
    }

    async main(path: string) {
        let ans1 = await this.part1(path, 12, 14, 13)
        console.log(ans1)
        let ans2 = await this.part2(path)
        console.log(ans2)
    }
}

new Day2().main("data/Day2/input.txt").then(() => console.log("Done"))
