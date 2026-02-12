// ── Result type ──────────────────────────────────────────────────────────────

export interface CalculatorInput {
  expression: string;
}

export interface CalculatorResult {
  tool: "calculator";
  input: string;
  result: number;
}

// ── Constants & allowed functions ────────────────────────────────────────────

const MAX_INPUT_LENGTH = 1000;

const CONSTANTS: Record<string, number> = {
  PI: Math.PI,
  E: Math.E,
};

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  min: Math.min,
  max: Math.max,
  log: Math.log,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
};

// ── Tokenizer ────────────────────────────────────────────────────────────────

const enum TokenType {
  Number,
  Plus,
  Minus,
  Star,
  Slash,
  Percent,
  Power,
  LeftParen,
  RightParen,
  Comma,
  Identifier,
  EOF,
}

interface Token {
  type: TokenType;
  value: string;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i]!;

    // Whitespace
    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }

    // Numbers (integers and decimals)
    if (ch >= "0" && ch <= "9") {
      let num = "";
      while (i < input.length && ((input[i]! >= "0" && input[i]! <= "9") || input[i] === ".")) {
        num += input[i];
        i++;
      }
      tokens.push({ type: TokenType.Number, value: num });
      continue;
    }

    // Decimal starting with dot (e.g. .5)
    if (ch === "." && i + 1 < input.length && input[i + 1]! >= "0" && input[i + 1]! <= "9") {
      let num = "";
      while (i < input.length && ((input[i]! >= "0" && input[i]! <= "9") || input[i] === ".")) {
        num += input[i];
        i++;
      }
      tokens.push({ type: TokenType.Number, value: num });
      continue;
    }

    // Identifiers (function names, constants)
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_") {
      let ident = "";
      while (
        i < input.length &&
        ((input[i]! >= "a" && input[i]! <= "z") ||
          (input[i]! >= "A" && input[i]! <= "Z") ||
          (input[i]! >= "0" && input[i]! <= "9") ||
          input[i] === "_")
      ) {
        ident += input[i];
        i++;
      }
      tokens.push({ type: TokenType.Identifier, value: ident });
      continue;
    }

    // Two-character operators
    if (ch === "*" && i + 1 < input.length && input[i + 1] === "*") {
      tokens.push({ type: TokenType.Power, value: "**" });
      i += 2;
      continue;
    }

    // Single-character operators
    switch (ch) {
      case "+":
        tokens.push({ type: TokenType.Plus, value: "+" });
        break;
      case "-":
        tokens.push({ type: TokenType.Minus, value: "-" });
        break;
      case "*":
        tokens.push({ type: TokenType.Star, value: "*" });
        break;
      case "/":
        tokens.push({ type: TokenType.Slash, value: "/" });
        break;
      case "%":
        tokens.push({ type: TokenType.Percent, value: "%" });
        break;
      case "(":
        tokens.push({ type: TokenType.LeftParen, value: "(" });
        break;
      case ")":
        tokens.push({ type: TokenType.RightParen, value: ")" });
        break;
      case ",":
        tokens.push({ type: TokenType.Comma, value: "," });
        break;
      default:
        throw new Error(`Unexpected character: '${ch}'`);
    }
    i++;
  }

  tokens.push({ type: TokenType.EOF, value: "" });
  return tokens;
}

// ── Recursive descent parser ─────────────────────────────────────────────────
//
// Grammar (standard operator precedence):
//   expression     = additive
//   additive       = multiplicative ( ("+" | "-") multiplicative )*
//   multiplicative = power ( ("*" | "/" | "%") power )*
//   power          = unary ( "**" power )?          // right-associative
//   unary          = ("-" | "+") unary | call
//   call           = IDENTIFIER "(" args ")" | primary
//   args           = expression ( "," expression )*
//   primary        = NUMBER | IDENTIFIER | "(" expression ")"

class Parser {
  private pos = 0;

  constructor(private tokens: Token[]) {}

  parse(): number {
    const result = this.expression();
    if (this.current().type !== TokenType.EOF) {
      throw new Error(
        `Unexpected token: '${this.current().value}' at position ${this.pos}`,
      );
    }
    return result;
  }

  private current(): Token {
    return this.tokens[this.pos]!;
  }

  private advance(): Token {
    const token = this.tokens[this.pos]!;
    this.pos++;
    return token;
  }

  private expect(type: TokenType): Token {
    const token = this.current();
    if (token.type !== type) {
      throw new Error(`Expected token type ${type}, got '${token.value}'`);
    }
    return this.advance();
  }

  private expression(): number {
    return this.additive();
  }

  private additive(): number {
    let left = this.multiplicative();

    while (
      this.current().type === TokenType.Plus ||
      this.current().type === TokenType.Minus
    ) {
      const op = this.advance();
      const right = this.multiplicative();
      if (op.type === TokenType.Plus) {
        left = left + right;
      } else {
        left = left - right;
      }
    }

    return left;
  }

  private multiplicative(): number {
    let left = this.power();

    while (
      this.current().type === TokenType.Star ||
      this.current().type === TokenType.Slash ||
      this.current().type === TokenType.Percent
    ) {
      const op = this.advance();
      const right = this.power();
      if (op.type === TokenType.Star) {
        left = left * right;
      } else if (op.type === TokenType.Slash) {
        if (right === 0) throw new Error("Division by zero");
        left = left / right;
      } else {
        if (right === 0) throw new Error("Modulo by zero");
        left = left % right;
      }
    }

    return left;
  }

  private power(): number {
    const base = this.unary();

    if (this.current().type === TokenType.Power) {
      this.advance();
      // Right-associative: 2**3**2 = 2**(3**2) = 512
      const exponent = this.power();
      return Math.pow(base, exponent);
    }

    return base;
  }

  private unary(): number {
    if (this.current().type === TokenType.Minus) {
      this.advance();
      return -this.unary();
    }
    if (this.current().type === TokenType.Plus) {
      this.advance();
      return this.unary();
    }
    return this.call();
  }

  private call(): number {
    if (
      this.current().type === TokenType.Identifier &&
      this.pos + 1 < this.tokens.length &&
      this.tokens[this.pos + 1]!.type === TokenType.LeftParen
    ) {
      const name = this.advance().value;
      const fn = FUNCTIONS[name];
      if (!fn) {
        throw new Error(
          `Unknown function: '${name}'. Available: ${Object.keys(FUNCTIONS).join(", ")}`,
        );
      }

      this.expect(TokenType.LeftParen);
      const args = this.args();
      this.expect(TokenType.RightParen);

      return fn(...args);
    }

    return this.primary();
  }

  private args(): number[] {
    const result: number[] = [this.expression()];

    while (this.current().type === TokenType.Comma) {
      this.advance();
      result.push(this.expression());
    }

    return result;
  }

  private primary(): number {
    const token = this.current();

    if (token.type === TokenType.Number) {
      this.advance();
      const num = Number(token.value);
      if (!Number.isFinite(num)) {
        throw new Error(`Invalid number: '${token.value}'`);
      }
      return num;
    }

    if (token.type === TokenType.Identifier) {
      const value = CONSTANTS[token.value];
      if (value === undefined) {
        throw new Error(
          `Unknown identifier: '${token.value}'. Available constants: ${Object.keys(CONSTANTS).join(", ")}. Available functions: ${Object.keys(FUNCTIONS).join(", ")}`,
        );
      }
      this.advance();
      return value;
    }

    if (token.type === TokenType.LeftParen) {
      this.advance();
      const value = this.expression();
      this.expect(TokenType.RightParen);
      return value;
    }

    throw new Error(`Unexpected token: '${token.value}'`);
  }
}

// ── Core function ────────────────────────────────────────────────────────────

export function calculate(expression: string): CalculatorResult {
  if (expression.length > MAX_INPUT_LENGTH) {
    throw new Error(
      `Expression too long: ${expression.length} chars (max ${MAX_INPUT_LENGTH})`,
    );
  }

  const trimmed = expression.trim();
  if (trimmed.length === 0) {
    throw new Error("Empty expression");
  }

  const tokens = tokenize(trimmed);
  const parser = new Parser(tokens);
  const result = parser.parse();

  if (!Number.isFinite(result)) {
    throw new Error(`Result is not finite: ${result}`);
  }

  return {
    tool: "calculator",
    input: expression,
    result,
  };
}

// ── Tool definition (OpenAI-compatible / LangChain / Vercel AI SDK) ──────────

export const calculatorToolDefinition = {
  type: "function" as const,
  function: {
    name: "calculator",
    description:
      "Evaluate a mathematical expression safely. Supports operators: + - * / % ** (power), parentheses, unary minus. Built-in functions: sqrt, abs, ceil, floor, round, min, max, log, sin, cos, tan. Constants: PI, E. Examples: '2 + 3 * 4', 'sqrt(144)', 'min(10, 20, 5)', '2 ** 10', 'PI * 2'. Input capped at 1000 characters. No eval() — uses a safe recursive descent parser.",
    parameters: {
      type: "object" as const,
      properties: {
        expression: {
          type: "string" as const,
          description:
            "The mathematical expression to evaluate (e.g. '2 + 3 * 4', 'sqrt(144)', 'PI * r ** 2')",
        },
      },
      required: ["expression"] as const,
      additionalProperties: false as const,
    },
  },
  execute: (input: CalculatorInput): CalculatorResult =>
    calculate(input.expression),
};
