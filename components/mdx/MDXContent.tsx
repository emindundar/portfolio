import * as runtime from "react/jsx-runtime";
import { mdxComponents } from "./components";

type MDXModule = { default: React.ComponentType<{ components?: Record<string, React.ComponentType> }> };

function useMDXComponent(code: string): MDXModule["default"] {
  const fn = new Function(code) as (rt: typeof runtime) => MDXModule;
  return fn({ ...runtime }).default;
}

export function MDXContent({ code, components = {} }: { code: string; components?: Record<string, React.ComponentType> }) {
  const Component = useMDXComponent(code);
  // eslint-disable-next-line react-hooks/static-components -- Velite's documented eval-compiled MDX pattern
  return <Component components={{ ...mdxComponents, ...components }} />;
}
