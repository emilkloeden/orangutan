import Token, { TokenType } from "../token/token.ts";
import Lexer from "../lexer/lexer.ts";
import * as ast from "../ast/ast.ts";

export enum Precedence {
  LOWEST = 0,
  PIPE = 1, // TODO: confirm this
  OR = 2,
  AND = 3,
  ASSIGN = 4,
  EQUALS = 5,
  LESSGREATER = 6,
  SUM = 7,
  PRODUCT = 8,
  MODULO = 9,
  PREFIX = 10,
  CALL = 11,
  INDEX = 12,
}

export const precedences: Record<string, Precedence> = {
  [TokenType.EQ]: Precedence.EQUALS,
  [TokenType.NOT_EQ]: Precedence.EQUALS,
  [TokenType.LT]: Precedence.LESSGREATER,
  [TokenType.LTE]: Precedence.LESSGREATER,
  [TokenType.GT]: Precedence.LESSGREATER,
  [TokenType.GTE]: Precedence.LESSGREATER,
  [TokenType.PLUS]: Precedence.SUM,
  [TokenType.MINUS]: Precedence.SUM,
  [TokenType.SLASH]: Precedence.PRODUCT,
  [TokenType.ASTERISK]: Precedence.PRODUCT,
  [TokenType.MODULO]: Precedence.MODULO,
  [TokenType.AND]: Precedence.AND,
  [TokenType.OR]: Precedence.OR,
  [TokenType.LPAREN]: Precedence.CALL,
  [TokenType.DOUBLE_COLON]: Precedence.CALL,
  [TokenType.LBRACKET]: Precedence.INDEX,
  [TokenType.PERIOD]: Precedence.INDEX,
  [TokenType.USE]: Precedence.CALL,
  [TokenType.ASSIGN]: Precedence.ASSIGN,
  [TokenType.PIPE]: Precedence.PIPE,
};

export interface IParserError {
  message: string
  currentToken?: Token
}

export class ParserError implements IParserError {
  constructor (public message: string, public currentToken?: Token){}
}

export default class Parser {
  public errors: ParserError[];
  private currentToken: Token;
  private peekToken: Token;
  private prefixParseFns: Record<string, () => ast.Expression | null>;
  private infixParseFns: Record<
    string,
    (left: ast.Expression | null) => ast.Expression | null
  >;

  constructor(private lexer: Lexer, private _currentDir: string) {
    this.errors = [];

    this.currentToken = this.lexer.nextToken();
    this.peekToken = this.lexer.nextToken();

    this.prefixParseFns = {
      [TokenType.IDENT]: this.parseIdentifier,
      [TokenType.INT]: this.parseIntegerLiteral,
      [TokenType.NUMBER]: this.parseNumberLiteral,
      [TokenType.BANG]: this.parsePrefixExpression,
      [TokenType.MINUS]: this.parsePrefixExpression,
      [TokenType.TRUE]: this.parseBoolean,
      [TokenType.FALSE]: this.parseBoolean,
      [TokenType.LPAREN]: this.parseGroupedExpression,
      [TokenType.IF]: this.parseIfExpression,
      [TokenType.FUNCTION]: this.parseFunctionLiteral,
      [TokenType.STRING]: this.parseStringLiteral,
      [TokenType.NULL]: this.parseNullLiteral,
      [TokenType.LBRACKET]: this.parseArrayLiteral,
      [TokenType.LBRACE]: this.parseHashLiteral,
      [TokenType.USE]: this.parseUseExpression,
    };

    this.infixParseFns = {
      [TokenType.PLUS]: this.parseInfixExpression,
      [TokenType.MINUS]: this.parseInfixExpression,
      [TokenType.SLASH]: this.parseInfixExpression,
      [TokenType.ASTERISK]: this.parseInfixExpression,
      [TokenType.MODULO]: this.parseInfixExpression,
      [TokenType.EQ]: this.parseInfixExpression,
      [TokenType.NOT_EQ]: this.parseInfixExpression,
      [TokenType.AND]: this.parseInfixExpression,
      [TokenType.OR]: this.parseInfixExpression,
      [TokenType.LT]: this.parseInfixExpression,
      [TokenType.LTE]: this.parseInfixExpression,
      [TokenType.GT]: this.parseInfixExpression,
      [TokenType.GTE]: this.parseInfixExpression,
      [TokenType.LPAREN]: this.parseCallExpression,
      [TokenType.LBRACKET]: this.parseIndexExpression,
      [TokenType.ASSIGN]: this.parseAssignExpression,
      [TokenType.PERIOD]: this.parsePropertyAccessExpression,
      [TokenType.PIPE]: this.parseInfixExpression,
      // [TokenType.DOUBLE_COLON]: this.parseModuleFunction,
    };
  }

  public nextToken = (): void => {
    this.currentToken = this.peekToken;
    this.peekToken = this.lexer.nextToken();
  };

  public parseProgram = (): ast.Program => {
    const program = new ast.Program();

    while (this.currentToken.tokenType !== TokenType.EOF) {
      const stmt = this.parseStatement();
      // TODO: Triple check this condition
      if (stmt != null) {
        program.statements.push(stmt);
      }
      this.nextToken();
    }
    return program;
  };

  // Statements
  parseStatement = (): ast.Statement | null => {
    if (this.currentToken.tokenType === TokenType.COMMENT) {
      return this.parseCommentStatement();
    }
    if (this.currentToken.tokenType === TokenType.LET) {
      return this.parseLetStatement();
    }
    if (this.currentToken.tokenType === TokenType.RETURN) {
      return this.parseReturnStatement();
    } else {
      return this.parseExpressionStatement();
    }
  };
  parseCommentStatement = (): ast.Comment => {
    return new ast.Comment(this.currentToken, this.currentToken.literal);
  };
  parseReturnStatement = (): ast.ReturnStatement => {
    const stmt = new ast.ReturnStatement(this.currentToken);
    this.nextToken();
    stmt.returnValue = this.parseExpression(Precedence.LOWEST);

    if (this.peekTokenIs(TokenType.SEMICOLON)) {
      this.nextToken();
    }

    return stmt;
  };
  
  parseExpressionStatement = (): ast.ExpressionStatement | null => {
    const stmt = new ast.ExpressionStatement(this.currentToken);
    stmt.expression = this.parseExpression(Precedence.LOWEST);

    if (this.peekTokenIs(TokenType.SEMICOLON)) {
      this.nextToken();
    }
    return stmt;
  };

  parseLetStatement = (): ast.LetStatement | null => {
    const stmt = new ast.LetStatement(this.currentToken);

    if (!this.expectPeek(TokenType.IDENT)) {
      return null;
    }

    stmt.name = new ast.Identifier(
      this.currentToken,
      this.currentToken.literal,
    );

    if (!this.expectPeek(TokenType.ASSIGN)) {
      return null;
    }

    this.nextToken();
    stmt.value = this.parseExpression(Precedence.LOWEST);

    if (this.peekTokenIs(TokenType.SEMICOLON)) {
      this.nextToken();
    }

    return stmt;
  };

  parseBlockStatement = (): ast.BlockStatement => {
    const block = new ast.BlockStatement(this.currentToken);
    block.statements = [];
    this.nextToken();

    while (
      !this.currentTokenIs(TokenType.RBRACE) && !this.currentTokenIs(
        TokenType.EOF,
      )
    ) {
      const stmt = this.parseStatement();
      if (stmt != null) { // TODO: Check definition
        block.statements.push(stmt);
      }
      this.nextToken();
    }
    return block;
  };

  // Expressions
  parseExpression = (precedence: number): ast.Expression | null => {
    const prefix = this.prefixParseFns[this.currentToken.tokenType];

    // TODO: Check definition
    if (prefix === undefined) {
      console.error(
        `No prefix parse function found for token: ${this.currentToken.tokenType} on line ${this.currentToken.line} column ${this.currentToken.column}`,
      );
      this.noPrefixParseFnError(this.currentToken);
      return null;
    }
    let leftExp = prefix();

    while (
      !this.peekTokenIs(TokenType.SEMICOLON) &&
      precedence < this.peekPrecedence()
    ) {
      const infix = this.infixParseFns[this.peekToken.tokenType];
      // TODO: Check definition
      if (infix === undefined || infix === null) {
        return null;
      }
      this.nextToken();

      leftExp = infix(leftExp);
    }
    return leftExp;
  };

  parseUseExpression = (): ast.UseExpression | null => {
    const token = this.currentToken;
    if (!this.expectPeek(TokenType.LPAREN)) {
      return null;
    }
    if (!this.expectPeek(TokenType.STRING)) {
      return null;
    }
    const value = this.parseExpression(Precedence.LOWEST);
    const expression = new ast.UseExpression(token, value);
    if (!this.expectPeek(TokenType.RPAREN)) {
      return null;
    }
    return expression;
  };

  parseBoolean = (): ast.Boolean => {
    return new ast.Boolean(
      this.currentToken,
      this.currentTokenIs(TokenType.TRUE),
    );
  };
  parseIdentifier = (): ast.Identifier => {
    return new ast.Identifier(this.currentToken, this.currentToken.literal);
  };

  parseIntegerLiteral = (): ast.Expression | null => {
    const lit = new ast.IntegerLiteral(this.currentToken);
    try {
      lit.value = parseInt(this.currentToken.literal);
      return lit;
    } catch (_) {
      this.errors.push(new ParserError(
        `Could not parse ${this.currentToken.literal} as integer.`,
      this.currentToken));
      return null;
    }
  };
  
  parseNumberLiteral = (): ast.Expression | null => {
    const lit = new ast.NumberLiteral(this.currentToken);
    try {
      lit.value = Number(this.currentToken.literal);
      return lit;
    } catch (_) {
      this.errors.push(new ParserError(
        `Could not parse ${this.currentToken.literal} as number.`,
      this.currentToken));
      return null;
    }
  };

  parseStringLiteral = (): ast.StringLiteral => {
    return new ast.StringLiteral(this.currentToken, this.currentToken.literal);
  };
  
  parseNullLiteral = (): ast.NullLiteral => {
    return new ast.NullLiteral(this.currentToken, this.currentToken.literal);
  };

  parseArrayLiteral = (): ast.Expression => {
    const array = new ast.ArrayLiteral(this.currentToken);
    array.elements = this.parseExpressionList(TokenType.RBRACKET);
    return array;
  };

  parsePrefixExpression = (): ast.Expression => {
    const expression = new ast.PrefixExpression(
      this.currentToken,
      this.currentToken.literal,
    );
    this.nextToken();
    expression.right = this.parseExpression(Precedence.PREFIX);
    return expression;
  };

  parseInfixExpression = (
    left: ast.Expression | null,
  ): ast.Expression | null => {
    const expression = new ast.InfixExpression(
      this.currentToken,
      this.currentToken.literal,
      left,
    );
    const precedence = this.currentPrecedence();
    this.nextToken();
    expression.right = this.parseExpression(precedence);
    return expression;
  };


  parseGroupedExpression = (): ast.Expression | null => {
    this.nextToken();
    const expression = this.parseExpression(Precedence.LOWEST);

    if (!this.expectPeek(TokenType.RPAREN)) {
      return null;
    }

    return expression;
  };

  parseIfExpression = (): ast.Expression | null => {
    const expression = new ast.IfExpression(this.currentToken);
    if (!this.expectPeek(TokenType.LPAREN)) {
      return null;
    }
    this.nextToken();
    expression.condition = this.parseExpression(Precedence.LOWEST);

    if (!this.expectPeek(TokenType.RPAREN)) {
      return null;
    }

    if (!this.expectPeek(TokenType.LBRACE)) {
      return null;
    }

    expression.consequence = this.parseBlockStatement();

    if (this.peekTokenIs(TokenType.ELSE)) {
      this.nextToken();

      if (!this.expectPeek(TokenType.LBRACE)) {
        return null;
      }

      expression.alternative = this.parseBlockStatement();
    }

    return expression;
  };

  parseFunctionLiteral = (): ast.FunctionLiteral | null => {
    const lit = new ast.FunctionLiteral(this.currentToken);

    if (!this.expectPeek(TokenType.LPAREN)) {
      return null;
    }

    lit.parameters = this.parseFunctionParameters();

    if (!this.expectPeek(TokenType.LBRACE)) {
      return null;
    }

    lit.body = this.parseBlockStatement();

    return lit;
  };

  parseFunctionParameters = (): ast.Identifier[] | null => {
    const identifiers: ast.Identifier[] = [];

    if (this.peekTokenIs(TokenType.RPAREN)) {
      this.nextToken();
      return identifiers;
    }

    this.nextToken();

    let ident = new ast.Identifier(
      this.currentToken,
      this.currentToken.literal,
    );
    identifiers.push(ident);

    while (this.peekTokenIs(TokenType.COMMA)) {
      this.nextToken();
      this.nextToken();
      ident = new ast.Identifier(this.currentToken, this.currentToken.literal);
      identifiers.push(ident);
    }
    if (!this.expectPeek(TokenType.RPAREN)) {
      return null;
    }
    return identifiers;
  };

  parseCallExpression = (fn: ast.Expression | null): ast.Expression | null => {
    const exp = new ast.CallExpression(this.currentToken, fn);
    exp.arguments = this.parseExpressionList(TokenType.RPAREN);
    return exp;
  };

  parseAssignExpression = (
    target: ast.Expression | null,
  ): ast.Expression | null => {
    const tok = this.currentToken;
    this.nextToken();
    const right = this.parseExpression(Precedence.LOWEST);
    return new ast.AssignExpression(tok, target, right);
  };

  parseIndexExpression = (
    left: ast.Expression | null,
  ): ast.Expression | null => {
    this.nextToken();
    const index = this.parseExpression(Precedence.LOWEST);
    const exp = new ast.IndexExpression(this.currentToken, left, index);

    if (!this.expectPeek(TokenType.RBRACKET)) {
      return null;
    }
    return exp;
  };
  parsePropertyAccessExpression = (
    left: ast.Expression | null,
  ): ast.Expression | null => {
    const token = this.currentToken; // This is the "." token
    this.nextToken(); // Move to the next token (which should be the property, e.g., "person" or "name")

    // Ensure the next token is an identifier (like "person" or "name")
    if (this.currentToken.tokenType !== TokenType.IDENT) {
      // Handle error or unexpected token
      return null;
    }

    const property = new ast.Identifier(
      this.currentToken,
      this.currentToken.literal,
    ); // Parse the property as an Identifier

    return new ast.PropertyAccessExpression(token, left, property);
  };

  parseHashLiteral = (): ast.Expression | null => {
    const lit = new ast.HashLiteral(this.currentToken);

    while (!this.peekTokenIs(TokenType.RBRACE)) {
      this.nextToken();
      const key = this.parseExpression(Precedence.LOWEST);

      if (!this.expectPeek(TokenType.COLON)) {
        return null;
      }

      this.nextToken();
      const value = this.parseExpression(Precedence.LOWEST);

      lit.pairs.set(key, value);

      if (
        !this.peekTokenIs(TokenType.RBRACE) && !this.expectPeek(
          TokenType.COMMA,
        )
      ) {
        return null;
      }
    }
    if (!this.expectPeek(TokenType.RBRACE)) {
      return null;
    }

    return lit;
  };

  parseModuleFunction = (
    left: ast.Expression | null,
  ): ast.Expression | null => {
    // Create a new ModuleFunctionCallExpression with 'left' as the module part
    const moduleFunctionExpression = new ast.ModuleFunctionCallExpression(
      this.currentToken,
      left, // This represents the module part
      null, // Initialize fn as null; we'll set it after parsing
    );

    // Advance to the function part
    this.nextToken();
    moduleFunctionExpression.fn = this.parseExpression(Precedence.CALL);

    // Parse the function call arguments if present
    if (this.expectPeek(TokenType.LPAREN)) {
      moduleFunctionExpression.arguments = this.parseExpressionList(
        TokenType.RPAREN,
      );
    }

    return moduleFunctionExpression;
  };

  // Helpers
  currentTokenIs = (tokenType: TokenType): boolean => {
    return this.currentToken.tokenType == tokenType;
  };

  currentPrecedence = (): Precedence => {
    return precedences[this.currentToken.tokenType] || Precedence.LOWEST;
  };

  expectPeek = (tokenType: TokenType): boolean => {
    if (this.peekTokenIs(tokenType)) {
      this.nextToken();
      return true;
    } else {
      this.peekError(tokenType);
      return false;
    }
  };

  peekTokenIs = (tokenType: TokenType): boolean => {
    return this.peekToken.tokenType === tokenType;
  };

  peekError = (tokenType: TokenType): void => {
    const errorMessage =
      `Expected next token to be ${tokenType}, got ${this.peekToken.tokenType} instead.`;
    this.errors.push(new ParserError(errorMessage, this.currentToken));
  };

  peekPrecedence = (): Precedence => {
    return precedences[this.peekToken.tokenType] || Precedence.LOWEST;
  };

  noPrefixParseFnError = (token: Token): void => {
    this.errors.push(new ParserError(`No prefix parse function for ${token.tokenType} found.`, this.currentToken));
  };

  parseExpressionList = (
    endTokenType: TokenType,
  ): (ast.Expression | null)[] | null => {
    const expressions: (ast.Expression | null)[] = [];

    if (this.peekTokenIs(endTokenType)) {
      this.nextToken();
      return expressions;
    }

    this.nextToken();
    expressions.push(this.parseExpression(Precedence.LOWEST));

    while (this.peekTokenIs(TokenType.COMMA)) {
      this.nextToken();
      this.nextToken();
      expressions.push(this.parseExpression(Precedence.LOWEST));
    }
    if (!this.expectPeek(endTokenType)) {
      return null;
    }

    return expressions;
  };
}

