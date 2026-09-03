/**
 * AST-based TypeScript/TSX Parser
 * Replaces regex-based parsing with proper AST analysis
 */

import * as ts from 'typescript';
import * as fs from 'fs';

export interface ParsedFile {
  imports: Array<{
    source: string;
    specifiers: string[];
    isTypeOnly: boolean;
  }>;
  exports: Array<{
    name: string;
    type: 'function' | 'const' | 'class' | 'interface' | 'type' | 'default';
    isAsync?: boolean;
  }>;
  functions: Array<{
    name: string;
    params: string[];
    isAsync: boolean;
    isExported: boolean;
  }>;
  classes: Array<{
    name: string;
    methods: string[];
    isExported: boolean;
  }>;
  components: Array<{
    name: string;
    props: string[];
    hooks: string[];
  }>;
  hooks: string[];
  apiEndpoints?: Array<{
    method: string;
    handler: string;
  }>;
  supabaseUsage: {
    tables: string[];
    rpcs: string[];
    hasClient: boolean;
  };
  dependencies: {
    react: boolean;
    supabase: boolean;
    tanstack: boolean;
  };
}

export class ASTParser {
  /**
   * Parse TypeScript/TSX file using AST
   */
  static parseFile(filePath: string): ParsedFile {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Create source file
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const result: ParsedFile = {
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      components: [],
      hooks: [],
      supabaseUsage: {
        tables: [],
        rpcs: [],
        hasClient: false
      },
      dependencies: {
        react: false,
        supabase: false,
        tanstack: false
      }
    };

    // Traverse AST
    this.visit(sourceFile, result);

    return result;
  }

  /**
   * Visit AST nodes recursively
   */
  private static visit(node: ts.Node, result: ParsedFile) {
    // Import declarations
    if (ts.isImportDeclaration(node)) {
      this.parseImport(node, result);
    }

    // Export declarations
    if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
      this.parseExport(node, result);
    }

    // Function declarations
    if (ts.isFunctionDeclaration(node)) {
      this.parseFunction(node, result);
    }

    // Variable declarations (const, let) - could be components or functions
    if (ts.isVariableStatement(node)) {
      this.parseVariableStatement(node, result);
    }

    // Class declarations
    if (ts.isClassDeclaration(node)) {
      this.parseClass(node, result);
    }

    // Call expressions (hooks, Supabase calls)
    if (ts.isCallExpression(node)) {
      this.parseCallExpression(node, result);
    }

    // Property access (supabase.from(), supabase.rpc())
    if (ts.isPropertyAccessExpression(node)) {
      this.parsePropertyAccess(node, result);
    }

    // Recurse into children
    ts.forEachChild(node, child => this.visit(child, result));
  }

  /**
   * Parse import declaration
   */
  private static parseImport(node: ts.ImportDeclaration, result: ParsedFile) {
    const moduleSpecifier = node.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) return;

    const source = moduleSpecifier.text;
    const specifiers: string[] = [];
    const isTypeOnly = node.importClause?.isTypeOnly || false;

    // Track dependencies
    if (source.includes('react')) result.dependencies.react = true;
    if (source.includes('supabase')) result.dependencies.supabase = true;
    if (source.includes('tanstack')) result.dependencies.tanstack = true;

    // Named imports
    if (node.importClause?.namedBindings) {
      const bindings = node.importClause.namedBindings;
      
      if (ts.isNamedImports(bindings)) {
        bindings.elements.forEach(element => {
          specifiers.push(element.name.text);
        });
      }
      
      // Namespace import
      if (ts.isNamespaceImport(bindings)) {
        specifiers.push('* as ' + bindings.name.text);
      }
    }

    // Default import
    if (node.importClause?.name) {
      specifiers.push(node.importClause.name.text);
    }

    result.imports.push({ source, specifiers, isTypeOnly });
  }

  /**
   * Parse export declaration
   */
  private static parseExport(node: ts.ExportDeclaration | ts.ExportAssignment, result: ParsedFile) {
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach(element => {
          result.exports.push({
            name: element.name.text,
            type: 'const' // Default to const, will be refined
          });
        });
      }
    }
  }

  /**
   * Parse function declaration
   */
  private static parseFunction(node: ts.FunctionDeclaration, result: ParsedFile) {
    const name = node.name?.text;
    if (!name) return;

    const isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false;
    const isExported = node.modifiers?.some(
      m => m.kind === ts.SyntaxKind.ExportKeyword
    ) || false;

    const params = node.parameters.map(p => {
      if (ts.isIdentifier(p.name)) {
        return p.name.text;
      }
      return 'unknown';
    });

    result.functions.push({ name, params, isAsync, isExported });

    if (isExported) {
      result.exports.push({ name, type: 'function', isAsync });
    }
  }

  /**
   * Parse variable statement (const, let, var)
   */
  private static parseVariableStatement(node: ts.VariableStatement, result: ParsedFile) {
    const isExported = node.modifiers?.some(
      m => m.kind === ts.SyntaxKind.ExportKeyword
    ) || false;

    node.declarationList.declarations.forEach(declaration => {
      const name = ts.isIdentifier(declaration.name) ? declaration.name.text : null;
      if (!name) return;

      // Check if it's a React component (function component)
      if (declaration.initializer) {
        const init = declaration.initializer;

        // Arrow function component
        if (ts.isArrowFunction(init)) {
          // Check if it returns JSX
          if (this.isReactComponent(init)) {
            const props = this.extractComponentProps(init);
            const hooks = this.extractHooks(init);
            result.components.push({ name, props, hooks });
          }

          if (isExported) {
            result.exports.push({ name, type: 'const', isAsync: init.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) });
          }
        }

        // Function expression
        if (ts.isFunctionExpression(init)) {
          if (this.isReactComponent(init)) {
            const props = this.extractComponentProps(init);
            const hooks = this.extractHooks(init);
            result.components.push({ name, props, hooks });
          }
        }
      }
    });
  }

  /**
   * Parse class declaration
   */
  private static parseClass(node: ts.ClassDeclaration, result: ParsedFile) {
    const name = node.name?.text;
    if (!name) return;

    const isExported = node.modifiers?.some(
      m => m.kind === ts.SyntaxKind.ExportKeyword
    ) || false;

    const methods: string[] = [];

    node.members.forEach(member => {
      if (ts.isMethodDeclaration(member) && ts.isIdentifier(member.name)) {
        methods.push(member.name.text);
      }
    });

    result.classes.push({ name, methods, isExported });

    if (isExported) {
      result.exports.push({ name, type: 'class' });
    }
  }

  /**
   * Parse call expressions (hooks, Supabase methods)
   */
  private static parseCallExpression(node: ts.CallExpression, result: ParsedFile) {
    const expression = node.expression;

    // Hook calls (useState, useEffect, custom hooks)
    if (ts.isIdentifier(expression)) {
      const name = expression.text;
      if (name.startsWith('use') && name.length > 3) {
        if (!result.hooks.includes(name)) {
          result.hooks.push(name);
        }
      }
    }

    // Supabase RPC calls
    if (ts.isPropertyAccessExpression(expression)) {
      const text = expression.name.text;
      if (text === 'rpc') {
        // Extract RPC name from first argument
        if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
          const rpcName = node.arguments[0].text;
          if (!result.supabaseUsage.rpcs.includes(rpcName)) {
            result.supabaseUsage.rpcs.push(rpcName);
          }
        }
      }
    }
  }

  /**
   * Parse property access (supabase.from('table'))
   */
  private static parsePropertyAccess(node: ts.PropertyAccessExpression, result: ParsedFile) {
    const name = node.name.text;

    // supabase.from('table')
    if (name === 'from' && node.parent && ts.isCallExpression(node.parent)) {
      const parent = node.parent;
      if (parent.arguments.length > 0 && ts.isStringLiteral(parent.arguments[0])) {
        const tableName = parent.arguments[0].text;
        if (!result.supabaseUsage.tables.includes(tableName)) {
          result.supabaseUsage.tables.push(tableName);
        }
      }
    }

    // createClient, supabase usage
    if (name === 'createClient' || name === 'supabase') {
      result.supabaseUsage.hasClient = true;
    }
  }

  /**
   * Check if function/arrow function is a React component
   */
  private static isReactComponent(node: ts.ArrowFunction | ts.FunctionExpression): boolean {
    // Heuristic: Returns JSX
    const returnType = node.type;
    if (returnType) {
      const text = returnType.getText();
      if (text.includes('JSX.Element') || text.includes('ReactElement') || text.includes('ReactNode')) {
        return true;
      }
    }

    // Check body for JSX
    if (node.body && ts.isBlock(node.body)) {
      let hasJSX = false;
      ts.forEachChild(node.body, child => {
        if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) {
          hasJSX = true;
        }
      });
      return hasJSX;
    }

    return false;
  }

  /**
   * Extract component props
   */
  private static extractComponentProps(node: ts.ArrowFunction | ts.FunctionExpression): string[] {
    const props: string[] = [];

    if (node.parameters.length > 0) {
      const firstParam = node.parameters[0];
      
      // Object binding pattern: function Component({ prop1, prop2 })
      if (ts.isObjectBindingPattern(firstParam.name)) {
        firstParam.name.elements.forEach(element => {
          if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
            props.push(element.name.text);
          }
        });
      }
    }

    return props;
  }

  /**
   * Extract hooks used in function
   */
  private static extractHooks(node: ts.ArrowFunction | ts.FunctionExpression): string[] {
    const hooks: string[] = [];

    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
        const name = n.expression.text;
        if (name.startsWith('use') && name.length > 3) {
          if (!hooks.includes(name)) {
            hooks.push(name);
          }
        }
      }
      ts.forEachChild(n, visit);
    };

    if (node.body) {
      visit(node.body);
    }

    return hooks;
  }

  /**
   * Parse API route file (Next.js/TanStack Start style)
   */
  static parseAPIRoute(filePath: string): { methods: string[]; endpoint: string } {
    const parsed = this.parseFile(filePath);
    const methods: string[] = [];

    // Look for HTTP method exports: GET, POST, PUT, PATCH, DELETE
    const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    
    parsed.exports.forEach(exp => {
      if (httpMethods.includes(exp.name)) {
        methods.push(exp.name);
      }
    });

    // Derive endpoint from file path
    let endpoint = filePath
      .replace(/\\/g, '/')
      .replace(/.*\/routes\/api\//, '/api/')
      .replace(/\.(ts|tsx|js|jsx)$/, '')
      .replace(/\.\$(\w+)/, '/:$1') // Convert .$ to :param
      .replace(/\/index$/, ''); // Remove /index

    return { methods, endpoint };
  }
}
