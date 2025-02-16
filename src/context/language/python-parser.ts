import { AbstractParser, EnclosingContext, TreeSitterNode } from "../../constants";
import Parser from "tree-sitter";
import Python from "tree-sitter-python";

/**
 * Utility function to process an AST node and check if it fully encloses a given line range.
 * @param node - The current AST node being processed
 * @param lineStart - The starting line number of the range to check (1-based)
 * @param lineEnd - The ending line number of the range to check (1-based)
 * @param largestSize - The size of the largest enclosing context found so far
 * @param largestEnclosingContext - The largest enclosing context node found so far
 * @returns An object containing the largest size and the largest enclosing context node
 */
const processNode = (
  node: Parser.SyntaxNode,
  lineStart: number,
  lineEnd: number,
  largestSize: number,
  largestEnclosingContext: Parser.SyntaxNode | null
) => {
  const { startPosition, endPosition } = node;

  if (startPosition.row + 1 <= lineStart && lineEnd <= endPosition.row + 1) {
    const size = endPosition.row - startPosition.row;
    if (size > largestSize) {
      largestSize = size;
      largestEnclosingContext = node;
    }
  }
  return { largestSize, largestEnclosingContext };
};

/**
 * Convert a Tree-sitter syntax node to a TreeSitterNode.
 * @param syntaxNode - The Tree-sitter syntax node to convert
 * @returns A TreeSitterNode representation of the syntax node
 */
const convertSyntaxNodeToTreeSitterNode = (syntaxNode: Parser.SyntaxNode): TreeSitterNode => {
  return {
    type: syntaxNode.type,
    loc: {
      start: {
        line: syntaxNode.startPosition.row + 1,
        column: syntaxNode.startPosition.column,
      },
      end: {
        line: syntaxNode.endPosition.row + 1,
        column: syntaxNode.endPosition.column,
      },
    },
  };
};

/**
 * Python parser: A parser for Python code that identifies syntactic contexts
 * and validates code as part of the AI agent's code review system.
 */
export class PythonParser implements AbstractParser {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(Python);
  }

  /**
   * Find the enclosing context for a given line range in the Python code.
   * @param file - Content of the Python file
   * @param lineStart - Starting line number (1-based)
   * @param lineEnd - Ending line number (1-based)
   * @returns An EnclosingContext object with the type of the enclosing node
   */
  findEnclosingContext(file: string, lineStart: number, lineEnd: number): EnclosingContext {
    const tree = this.parser.parse(file);

    let largestEnclosingContext: Parser.SyntaxNode | null = null;
    let largestSize = 0;

    /**
     * Recursive function to traverse AST nodes
     * @param node - The current AST node being traversed
     */
    const traverseNodes = (node: Parser.SyntaxNode) => {
      // Process the current node to check if it encloses the specified line range
      ({ largestSize, largestEnclosingContext } = processNode(
        node,
        lineStart,
        lineEnd,
        largestSize,
        largestEnclosingContext
      ));
      // Recursively inspect child nodes
      for (let i = 0; i < node.childCount; i++) {
        traverseNodes(node.child(i)); // Traverse each child node
      }
    };

    // Start of the traversal from the root node
    traverseNodes(tree.rootNode);

    return {
      enclosingContext: largestEnclosingContext
        ? convertSyntaxNodeToTreeSitterNode(largestEnclosingContext) // Convert to TreeSitterNode if found
        : null, // Return null if no enclosing context found
    };
  }

  /**
   * Validate the Python code by attempting to parse it.
   * @param file - Content of the Python file
   * @returns An object indicating whether the code is valid and any error message
   */
  dryRun(file: string): { valid: boolean; error: string } {
    try {
      const tree = this.parser.parse(file);

      if (tree.rootNode.hasError) {
        return {
          valid: false,
          error: "Syntax error in Python code",
        };
      }
      return { valid: true, error: "" };
    } catch (err) {
      return {
        valid: false,
        error: `Error parsing Python code: ${err.message}`,
      };
    }
  }
}
