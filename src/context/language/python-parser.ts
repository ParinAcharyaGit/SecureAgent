import { AbstractParser, EnclosingContext, TreeSitterNode } from "../../constants";
import Parser from "tree-sitter";
import Python from "tree-sitter-python";

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

export class PythonParser implements AbstractParser {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(Python);
  }

  findEnclosingContext(file: string, lineStart: number, lineEnd: number): EnclosingContext {
    const tree = this.parser.parse(file);

    let largestEnclosingContext: Parser.SyntaxNode | null = null;
    let largestSize = 0;

    const traverseNodes = (node: Parser.SyntaxNode) => {
      ({ largestSize, largestEnclosingContext } = processNode(
        node,
        lineStart,
        lineEnd,
        largestSize,
        largestEnclosingContext
      ));
      for (let i = 0; i < node.childCount; i++) {
        traverseNodes(node.child(i));
      }
    };

    traverseNodes(tree.rootNode);

    return {
      enclosingContext: largestEnclosingContext
        ? convertSyntaxNodeToTreeSitterNode(largestEnclosingContext)
        : null,
    };
  }

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
