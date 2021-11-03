import React, { useCallback, useContext, useMemo } from 'react';

import { GetProgramAccountsFilter } from '@solana/web3.js';
import { AccountInfo, AccountLayout, TOKEN_PROGRAM_ID } from '@solana/spl-token';

import { Provider } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import { TokenAccountContext } from '../models/TokenAccountContext';
import { useProgramSubscription } from '../hooks/useProgramSubscription';
import { useMultisigProgram } from '../hooks/useMultisigProgram';
import { KeyedAccountInfo } from '@solana/web3.js';

function getProgramId(_provider: Provider): PublicKey {
  return TOKEN_PROGRAM_ID;
}

function getFilters(provider: Provider): GetProgramAccountsFilter[] {
  return [
    {
      dataSize: AccountLayout.span,
    },
    {
      memcmp: {
        offset: 32,
        bytes: provider.wallet.publicKey.toBase58(),
      },
    },
  ];
}

function parseTokenAccount(raw: KeyedAccountInfo): AccountInfo {
  return AccountLayout.decode(raw.accountInfo.data) as AccountInfo;
}

interface Interface {
  tokens: TokenAccountContext;
  reload: () => Promise<AccountInfo[]>;
  isLoading: boolean;
}

const Context = React.createContext<Interface>(undefined!);

export function AccountProvider({ children = null as any }) {
  const multisigProgram = useMultisigProgram();

  const [splAccounts, reloadSplAccounts, isReloadingSplAccounts] =
    useProgramSubscription<AccountInfo>(
      getProgramId,
      getFilters,
      parseTokenAccount,
      multisigProgram.provider
    );

  const tokens = useMemo(() => {
    const result = [...splAccounts];
    return TokenAccountContext.index(result);
  }, [splAccounts]);

  const reload = useCallback(async () => {
    const [splAccounts] = await Promise.all([
      reloadSplAccounts(),
    ]);
    const result = [...splAccounts];
    return result;
  }, [reloadSplAccounts]);

  const isLoading = useMemo(() => {
    return isReloadingSplAccounts;
  }, [isReloadingSplAccounts]);

  return (
    <Context.Provider value={{ tokens, reload, isLoading }}>
      {children}
    </Context.Provider>
  );
}

export const useTokenAccountContext = () => {
  return useContext(Context);
};
