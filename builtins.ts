import * as objects from "./objects.ts"

const putsFn = (...args: (objects.Objects | null)[]): objects.Objects => {
    for(const arg of args) {
        if(arg === null) {
            throw new Error('putsFn received null in arguments')
        }
        console.log(arg.toString())
    }
    return new objects.Null()
}

const typeFn = (...args: (objects.Objects | null)[]): objects.String | objects.Error => {
    if(args.length !== 1) {
        return wrongNumberOfArgs(args.length, 1)
    }
    const arg = args[0];
    if(arg === null) {
        return new objects.String("Host language null")
    }
    return new objects.String(arg.objectType());
}

const wrongNumberOfArgs = (actual: number, expected: number = 1): objects.Error => {
    return new objects.Error(`wrong number of arguments. got=${actual}, want=${expected}`)
}


const BUILTINS: Record<string, objects.BuiltIn> = {
    "puts": new objects.BuiltIn(putsFn),
    "type": new objects.BuiltIn(typeFn)
}

export default BUILTINS;