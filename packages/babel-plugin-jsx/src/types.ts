import * as BabelTypes from "@babel/types";
import { NodePath} from "@babel/traverse";


export type T  = typeof BabelTypes
export type State = any


export type JSXPath  = NodePath<BabelTypes.JSXElement>
export type JSXSpreadChildPath  = NodePath<BabelTypes.JSXSpreadChild>
export type JSXExpressionContainerPath = NodePath<BabelTypes.JSXExpressionContainer>
export type JSXSpreadAttriPath = NodePath<BabelTypes.StringLiteral|BabelTypes.JSXElement|BabelTypes.JSXExpressionContainer>
export type JSXExpressionPath = NodePath<BabelTypes.Expression>
export type JSXChildrenPath = NodePath<BabelTypes.JSXElement | BabelTypes.JSXExpressionContainer | BabelTypes.JSXFragment | BabelTypes.JSXText | BabelTypes.JSXSpreadChild>
export type JSXAttriPath = NodePath<BabelTypes.JSXAttribute>
export type JSXOpengingElementPath = NodePath<BabelTypes.JSXOpeningElement>