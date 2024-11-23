import Token, { TokenType } from "../token/token.ts";
import Lexer from "../lexer/lexer.ts";
import * as ast from "../ast/ast.ts";

export enum Precedence {
  LOWEST = 0,
  OR = 1,
  AND = 2,
  ASSIGN = 3,
  EQUALS = 4,
  LESSGREATER = 5,
  SUM = 6,
  PRODUCT = 7,
  MODULO = 8,
  PREFIX = 9,
  CALL = 10,
  INDEX = 11,
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
};

export default class Parser {
  public errors: string[];
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
      [TokenType.BANG]: this.parsePrefixExpression,
      [TokenType.MINUS]: this.parsePrefixExpression,
      [TokenType.TRUE]: this.parseBoolean,
      [TokenType.FALSE]: this.parseBoolean,
      [TokenType.LPAREN]: this.parseGroupedExpression,
      [TokenType.IF]: this.parseIfExpression,
      [TokenType.FUNCTION]: this.parseFunctionLiteral,
      [TokenType.STRING]: this.parseStringLiteral,
      [TokenType.LBRACKET]: this.parseArrayLiteral,
      [TokenType.LBRACE]: this.parseHashLiteral,
      [TokenType.USE]: this.parseUseExpression,
      [TokenType.WHILE]: this.parseWhileStatement,
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
    }
    if (this.currentToken.tokenType === TokenType.WHILE) {
      return this.parseWhileStatement();
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
  parseWhileStatement = (): ast.WhileStatement | null => {
    const stmt = new ast.WhileStatement(this.currentToken);
    if (!this.expectPeek(TokenType.LPAREN)) {
      return null;
    }

    this.nextToken();
    stmt.condition = this.parseExpression(Precedence.LOWEST);
    if (!this.expectPeek(TokenType.RPAREN)) {
      return null;
    }

    if (!this.expectPeek(TokenType.LBRACE)) {
      return null;
    }

    stmt.body = this.parseBlockStatement();

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
        `No prefix parse function found for token: ${this.currentToken.tokenType}`,
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
    } catch (e) {
      this.errors.push(
        `Could not parse ${this.currentToken.literal} as integer. ${printLineAndColumn(this.currentToken)}`,
      );
      return null;
    }
  };
  parseStringLiteral = (): ast.StringLiteral => {
    return new ast.StringLiteral(this.currentToken, this.currentToken.literal);
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
      `Expected next token to be ${tokenType}, got ${this.peekToken.tokenType} instead. ${printLineAndColumn(this.peekToken)}`;
    this.errors.push(errorMessage);
  };

  peekPrecedence = (): Precedence => {
    return precedences[this.peekToken.tokenType] || Precedence.LOWEST;
  };

  noPrefixParseFnError = (token: Token): void => {
    this.errors.push(`No prefix parse function for ${token.tokenType} found. ${printLineAndColumn(token)}`);
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

const printLineAndColumn = (token: Token) => {
  return `Found on Line: ${token.line} and Column: ${token.column}.`
}
