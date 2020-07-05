import * as ts from "typescript";

export default function createTransformer() {
  return (context) => {
    const visitor = (node: ts.Node) => {
      if (ts.isSourceFile(node)) {
        return ts.visitEachChild(node, visitor, context);
      }
      if (ts.isImportDeclaration(node)) {
        // @ts-ignore
        if (node.moduleSpecifier.text !== "vue") {
          return node;
        } else {
          if (
            ts.isNamedImports(node.importClause.namedBindings) &&
            node.importClause.namedBindings.elements.find(
              (element) => element.name.text === "createVNode"
            )
          ) {
            return ts.updateImportDeclaration(
              node,
              node.decorators,
              node.modifiers,
              ts.updateImportClause(
                node.importClause,
                undefined,
                ts.createNamedImports([
                  ...((ts.isNamedImports(node.importClause.namedBindings) &&
                    node.importClause.namedBindings.elements) ||
                    []),
                ]),
                false
              ),
              node.moduleSpecifier
            );
          }
          return ts.updateImportDeclaration(
            node,
            node.decorators,
            node.modifiers,
            ts.updateImportClause(
              node.importClause,
              undefined,
              ts.createNamedImports([
                ...((ts.isNamedImports(node.importClause.namedBindings) &&
                  node.importClause.namedBindings.elements) ||
                  []),
                ts.createImportSpecifier(
                  undefined,
                  ts.createIdentifier("createVNode")
                ),
              ]),
              false
            ),
            node.moduleSpecifier
          );
        }
      }
      if (ts.isJsxText(node)) {
        return ts.createStringLiteral(node.text);
      }
      if (ts.isJsxAttribute(node)) {
        return ts.createPropertyAssignment(
          ts.createStringLiteral(node.name.text),
          // @ts-ignore
          ts.createStringLiteral(node.initializer.text)
        );
      }
      if (ts.isJsxElement(node)) {
        const tag = node.openingElement.tagName.getText(); //getTag(t, path.get('openingElement'))
        const attributes = node.openingElement.attributes;

        return ts.createCall(ts.createIdentifier("createVNode"), undefined, [
          ts.createStringLiteral(tag),
          ts.createObjectLiteral(attributes.properties.map(visitor), true),
          ts.createArrayLiteral(node.children.map(visitor), false),
        ]);
      } else {
        if (node.getChildren().length) {
          return ts.visitEachChild(node, visitor, context);
        }
        return node;
      }
    };
    return (node) => ts.visitNode(node, visitor);
  };
}
