import { AbstractParser, EnclosingContext } from "../../constants";
import * as parser from "@babel/parser";
import traverse, { NodePath, Node } from "@babel/traverse";

/**
 * Utility function to process AST node and check if it fully encloses a given line range.
 * @param path - The NodePath of the current AST node being processed
 * @param lineStart - The starting line number of the range to check (1-based)
 * @param lineEnd - The ending line number of the range to check (1-based)
 * @param largestSize - The size of the largest enclosing context found so far
 * @param largestEnclosingContext - The largest enclosing context node found so far
 * @returns An object containing the largest size and the largest enclosing context node
 */
const processNode = (
  path: NodePath<Node>,
  lineStart: number,
  lineEnd: number,
  largestSize: number,
  largestEnclosingContext: Node | null
) => {
  const { start, end } = path.node.loc;
  if (start.line <= lineStart && lineEnd <= end.line) {
    const size = end.line - start.line;
    if (size > largestSize) {
      largestSize = size;
      largestEnclosingContext = path.node;
    }
  }
  return { largestSize, largestEnclosingContext };
};

/**
 * JavaScript parser: A parser for JavaScript code that identifies syntactic contexts
 * and validates code as part of the AI agent's code review system.
 */
export class JavascriptParser implements AbstractParser {
  /**
   * Find the enclosing context for a given line range in the JavaScript code.
   * @param file - Content of the JavaScript file
   * @param lineStart - Starting line number (1-based)
   * @param lineEnd - Ending line number (1-based)
   * @returns An EnclosingContext object with the type of the enclosing node
   */
  findEnclosingContext(
    file: string,
    lineStart: number,
    lineEnd: number
  ): EnclosingContext {
    const ast = parser.parse(file, {
      sourceType: "module",
      plugins: ["jsx", "typescript"], // To allow JSX and TypeScript
    });
    let largestEnclosingContext: Node | null = null;
    let largestSize = 0;
    traverse(ast, {
      Function(path) {
        ({ largestSize, largestEnclosingContext } = processNode(
          path,
          lineStart,
          lineEnd,
          largestSize,
          largestEnclosingContext
        ));
      },
      TSInterfaceDeclaration(path) {
        ({ largestSize, largestEnclosingContext } = processNode(
          path,
          lineStart,
          lineEnd,
          largestSize,
          largestEnclosingContext
        ));
      },
    });
    return {
      enclosingContext: largestEnclosingContext,
    } as EnclosingContext;
  }

  /**
   * Validate the JavaScript code by attempting to parse it.
   * @param file - Content of the JavaScript file
   * @returns An object indicating whether the code is valid and any error message
   */
  dryRun(file: string): { valid: boolean; error: string } {
    try {
      const ast = parser.parse(file, {
        sourceType: "module",
        plugins: ["jsx", "typescript"], // To allow JSX and TypeScript
      });
      return {
        valid: true,
        error: "",
      };
    } catch (exc) {
      return {
        valid: false,
        error: exc.message,
      };
    }
  }
}
