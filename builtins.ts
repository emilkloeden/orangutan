import * as objects from "./objects.ts"

const putsFn = (args: objects.Objects[]): objects.Objects => {
    for(const arg of args) {
        console.log(arg.toString())
    }
    return new objects.Null()
}

const wrongNumberOfArgs = (actual: number, expected: number = 1): objects.Objects => {
    return new objects.Error(`wrong number of arguments. got=${actual}, want=${expected}`)
}


const BUILTINS: Record<string, objects.BuiltIn> = {
    "puts": new objects.BuiltIn(putsFn)
}

export default BUILTINS;