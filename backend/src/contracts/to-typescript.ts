import { z } from "zod";

// Prints zod schemas as TypeScript types, for the app's generated contract
// file. It covers the zod types the contracts use and throws on anything
// else, so a new kind of field can't be silently printed as `unknown`.

type Named = Map<z.ZodTypeAny, string>;

function print(schema: z.ZodTypeAny, named: Named, indent: string, top = false): string {
  const name = named.get(schema);
  if (name && !top) return name;
  const def = schema._def as { typeName: z.ZodFirstPartyTypeKind };

  switch (def.typeName) {
    case z.ZodFirstPartyTypeKind.ZodString:
      return "string";
    case z.ZodFirstPartyTypeKind.ZodNumber:
      return "number";
    case z.ZodFirstPartyTypeKind.ZodBoolean:
      return "boolean";
    case z.ZodFirstPartyTypeKind.ZodLiteral:
      return JSON.stringify((schema as z.ZodLiteral<unknown>).value);
    case z.ZodFirstPartyTypeKind.ZodEnum:
      return (schema as z.ZodEnum<[string, ...string[]]>).options.map((o) => JSON.stringify(o)).join(" | ");
    case z.ZodFirstPartyTypeKind.ZodNullable:
      return `${print((schema as z.ZodNullable<z.ZodTypeAny>).unwrap(), named, indent)} | null`;
    case z.ZodFirstPartyTypeKind.ZodArray: {
      const inner = print((schema as z.ZodArray<z.ZodTypeAny>).element, named, indent);
      return /^[\w.]+$/.test(inner) ? `${inner}[]` : `Array<${inner}>`;
    }
    case z.ZodFirstPartyTypeKind.ZodObject: {
      const shape = (schema as z.AnyZodObject).shape as Record<string, z.ZodTypeAny>;
      const inner = `${indent}  `;
      const lines = Object.entries(shape).map(([key, field]) => {
        const optional = field.isOptional();
        const type = optional ? (field as z.ZodOptional<z.ZodTypeAny>).unwrap() : field;
        const doc = field.description ? `${inner}/** ${field.description} */\n` : "";
        return `${doc}${inner}${key}${optional ? "?" : ""}: ${print(type, named, inner)};`;
      });
      return `{\n${lines.join("\n")}\n${indent}}`;
    }
    default:
      throw new Error(`to-typescript: no printer for ${def.typeName}`);
  }
}

export function contractToTypeScript(contract: Record<string, z.ZodTypeAny>, header: string): string {
  const named: Named = new Map(Object.entries(contract).map(([name, schema]) => [schema, name]));
  const blocks = Object.entries(contract).map(([name, schema]) => {
    const doc = schema.description ? `/** ${schema.description} */\n` : "";
    return `${doc}export type ${name} = ${print(schema, named, "", true)};`;
  });
  return `${header}\n\n${blocks.join("\n\n")}\n`;
}
