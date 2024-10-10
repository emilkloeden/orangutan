import { HashPair } from "./objects.ts";
import Token from "./token.ts"

export interface Node {
    tokenLiteral(): string;
    toString(): string;
}

export interface Statement extends Node {}
export interface Expression extends Node {}


export class Program implements Node {
    statements: Statement[]
    constructor() {
        this.statements = [];
    }

    tokenLiteral() {
        if (this.statements.length) {
            return this.statements[0].tokenLiteral()
        }
        return "";
    }

    toString() {
        return this.statements.map(s => s.toString()).join("")
    }
}

export class LetStatement implements Statement {
    name!: Identifier;
    public value!: Expression | null;
    constructor(private token: Token) {}

    tokenLiteral() {
        return this.token.literal;
    }

    toString() {
        let out = `${this.tokenLiteral()} ${this.name} = `
        // TODO: Check definition
        if (this.value != null) {
            out += this.value.toString()
        }
        out += ";"
        return out;
    }
}



export class ReturnStatement implements Statement {
    public returnValue!: Expression | null
    constructor(private token: Token) {} 
    
    tokenLiteral() {
        return this.token.literal
    } 
    toString() {
        return `${this.token.literal} ${this.returnValue};`
    }

}
export class WhileStatement implements Statement {
    public condition!: Expression
    public body!: Expression
    
    constructor(private token: Token) {} 

    tokenLiteral() {
        return this.token.literal
    } 
    toString() {
        return `${this.token.literal} (${this.condition}) {{${this.body.toString()}}};`;
    }

}
export class Comment implements Statement {
    constructor(private token: Token, public value: string) {} 
    
    tokenLiteral() {
        return this.token.literal
    } 
    toString() {
        return this.value;
    }

}
export class ExpressionStatement implements Statement {
    public expression!: Expression | null
    constructor(private token: Token) {} 
    
    toString() {
        return this.expression != null ? this.expression.toString() : ""
    // TODO: find out why this is here statement_node(this):
        // pass
    } 
    tokenLiteral() {
        return this.token.literal
    }

}
export class BlockStatement implements Statement {
    public statements: Statement[]
    constructor(private token: Token) {
        this.statements = []
    } 
    toString() {
        return this.statements.map(stmt => stmt.toString()).join("")
    } 
    tokenLiteral() {
        return this.token.literal
    }
}

// #######################
// #     EXPRESSIONS     #
// #######################

export class Identifier implements Expression {
    constructor(private token: Token, public value: string) {} 
    
    toString() {
        return this.value

    // TODO: check why this was here?: expressionNode(this) {}
    } 
    
    tokenLiteral() {
        return this.token.literal
    }

}
export class IntegerLiteral implements Expression {
    value!: number
    constructor(private token: Token) {} 
    
    toString() {
        // TODO: Check definition
        return this.value != null ? this.value.toString() : ""
    } 
    tokenLiteral() {
        return this.token.literal
    }

}
export class Boolean implements Expression {
    constructor(private token: Token, public value: boolean) {
        
    } 
    toString() {
        return this.token.literal.toString()

    } 
    tokenLiteral() {
        return this.token.literal
    }

}
export class StringLiteral implements Expression {
    constructor(private token: Token, public value: string) {} 
    toString() {
        return `"${this.value.toString()}"`

    } tokenLiteral() {
        return this.token.literal
    }

}
export class FunctionLiteral implements Expression {
    public parameters: Identifier[]
    public body!: BlockStatement;
    constructor(private token: Token) {
        this.parameters = []
    } 
    // TODO: Triple check this
    toString() {
        return `${this.tokenLiteral()}(${(this.parameters.map(p => p.toString()).join(", "))}) {${this.body.toString()}}`

    } tokenLiteral() {
        return this.token.literal
    }

}
export class ArrayLiteral implements Expression {
    public elements: Expression[]
    constructor(private token: Token) {
        this.elements = [];
    } 
    toString() {
        return `[${this.elements.map(e => e.toString()).join(", ")}]`
    } 
    tokenLiteral() {
        return this.token.literal
    }
}

export type HashKey = Record<string, string>

export class HashLiteral implements Expression {
    pairs: Record<HashKey, HashPair>
    constructor(private token: Token) {
        this.pairs = {}
    }

    toString() {
        const pairs = []
        for (const [key, val] of Object.entries(this.pairs)) {
            pairs.push(`${key.toString()}:${val.toString()}`)
        }
        return `{{${pairs.join(", ")}}}`

    } tokenLiteral() {
        return this.token.literal
    }

}
export class PrefixExpression implements Expression {
    public right!: Expression | null
    constructor(private token: Token, public operator: string) {}
    
    toString() {
        return `(${this.operator}${this.right?.toString() ?? "ERROR WITH PREFIXEXPRESSION"})`
    } 
    tokenLiteral() {
        return this.token.literal
    }
}

export class InfixExpression implements Expression {
    public right!: Expression
    
    constructor(private token: Token, public operator: string, public left: Expression) {}

    toString() {
        return `(${this.left.toString()} ${this.operator} ${this.right.toString()})`
    } 
    tokenLiteral() {
        return this.token.literal
    }
}

export class IfExpression implements Expression {
    public condition!: Expression
    public consequence!: BlockStatement
    public alternative!: BlockStatement

    constructor(private token: Token) {}

    toString() {
        let out = `"if${this.condition.toString()} {{ ${this.consequence.toString()} }}`
        if (this.alternative != null) {
            out += `else ${this.alternative.toString()}`
        }
        return out

    } 
    tokenLiteral() {
        return this.token.literal
    }
}

export class CallExpression implements Expression {
    public arguments: Expression[]

    constructor(private token: Token, public fn: Expression) {
        this.arguments = []
    }

    toString() {
        const args = this.arguments.map(arg => arg.toString());
        return `${this.fn.toString()}(${args.join(', ')})`

    } 
    
    tokenLiteral() {
        return this.token.literal
    }
}

export class IndexExpression implements Expression {
    constructor(private token: Token, public left: Expression, public index: Expression) {} 
    
    toString() {
        // TODO: Check definition
        if (this.index == null) {
            return `(${this.left.toString()}[null])`
        }
        return `${this.left.toString()}[${this.index.toString()}])`
    } 
    tokenLiteral() {
        return this.token.literal
    }
}

