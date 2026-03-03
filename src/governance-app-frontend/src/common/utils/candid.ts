import { IDL } from '@icp-sdk/core/candid';

/**
 * Wraps an IDL factory to produce a certified variant where all methods
 * are treated as update calls (no 'query' annotation).
 * This forces the agent to go through consensus for every call.
 */
export const toCertifiedIdlFactory = (factory: IDL.InterfaceFactory): IDL.InterfaceFactory => {
  return ({ IDL: idl }) => {
    const service = factory({ IDL: idl });
    const methods: Record<string, IDL.FuncClass> = {};

    for (const [name, func] of service._fields) {
      methods[name] = idl.Func(
        func.argTypes,
        func.retTypes,
        func.annotations.filter((a: string) => a !== 'query'),
      );
    }

    return idl.Service(methods);
  };
};
