import {
  TokenBalanceLineItem,
  VaultDetail,
  VaultTransaction,
} from '@/components/pages'
import { getDAOMetadata } from '@/services/getDAOMetadata'
import { cacheTokenPrices } from '@/services/getTokenUSDPrice'
import { MinionTransaction, TokenBalance } from '@/types/DAO'
import { getTokenExplorer } from '@/utils/explorer'
import { convertTokenToValue, convertTokenValueToUSD } from '@/utils/methods'
import { orderBy } from 'lodash'
import { GetServerSidePropsContext } from 'next'
import { getMinions } from '../../../../services/getMinions'

export default VaultDetail

type CalculatedTokenBalances = {
  [tokenAddress: string]: {
    in: number
    out: number
    usdIn: number
    usdOut: number
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { id: daoAddress, minion_address: minionAddress } = context.query

  // FIXME: A hack to cache token prices before we fetch prices for all tokens in parallel
  await cacheTokenPrices()

  try {
    const daoMeta = await getDAOMetadata(daoAddress as string)
    const cachedMinions = await getMinions(daoAddress as string)
    const minion = cachedMinions.find(
      (cachedMinion) => cachedMinion.minionAddress === minionAddress
    )

    if (minion === undefined) {
      return {
        props: {
          error: {
            message: (error as Error).message,
          },
        },
      }
    }

    // used to store all the inflow and outflow of each token when iterating over the list of moloch stats
    const calculatedTokenBalances: CalculatedTokenBalances = {}

    const initTokenBalance = (tokenAddress: string) => {
      if (!(tokenAddress in calculatedTokenBalances)) {
        calculatedTokenBalances[tokenAddress] = {
          out: 0,
          usdOut: 0,
          in: 0,
          usdIn: 0,
        }
      }
    }
    const incrementInflow = (
      tokenAddress: string,
      inValue: number,
      usdValue: number
    ) => {
      initTokenBalance(tokenAddress)

      const tokenStats = calculatedTokenBalances[tokenAddress]
      calculatedTokenBalances[tokenAddress] = {
        ...tokenStats,
        in: tokenStats.in + inValue,
        usdIn: tokenStats.usdIn + usdValue,
      }
    }

    const incrementOutflow = (
      tokenAddress: string,
      outValue: number,
      usdValue: number
    ) => {
      initTokenBalance(tokenAddress)

      const tokenStats = calculatedTokenBalances[tokenAddress]
      calculatedTokenBalances[tokenAddress] = {
        ...tokenStats,
        out: tokenStats.out + outValue,
        usdOut: tokenStats.usdOut + usdValue,
      }
    }

    const mapMinionTransactionsToTreasuryTransaction = async (
      minionTransactions: MinionTransaction[]
    ): Promise<VaultTransaction[]> => {
      const treasuryTransactions = await Promise.all(
        minionTransactions.map(async (minionTransaction) => {
          const usdValue = await convertTokenValueToUSD({
            token: {
              tokenAddress: minionTransaction.tokenAddress,
              decimals: minionTransaction.tokenDecimals,
              symbol: minionTransaction.tokenSymbol,
            },
            tokenBalance: Number(minionTransaction.value),
          })

          const tokenValue = convertTokenToValue(
            minionTransaction.value,
            minionTransaction.tokenDecimals
          )

          const balances = (() => {
            if (minionTransaction.deposit === true) {
              incrementInflow(
                minionTransaction.tokenAddress,
                tokenValue,
                usdValue
              )
              return {
                in: tokenValue,
                usdIn: usdValue,
                out: 0,
                usdOut: 0,
              }
            }

            if (minionTransaction.deposit === false) {
              incrementOutflow(
                minionTransaction.tokenAddress,
                tokenValue,
                usdValue
              )
              return {
                in: 0,
                usdIn: 0,
                out: tokenValue,
                usdOut: usdValue,
              }
            }

            return {
              in: 0,
              usdIn: 0,
              out: 0,
              usdOut: 0,
            }
          })()

          // const txExplorerLink = getTxExplorer(
          //   daoMeta.network,
          //   minionTransaction.id
          // )

          // TODO: To be implemented later
          const txExplorerLink = '#'

          return {
            date: minionTransaction.timestamp,
            type: minionTransaction.deposit ? 'Deposit' : 'Withdraw',
            tokenSymbol: minionTransaction.tokenSymbol,
            tokenDecimals: minionTransaction.tokenDecimals,
            tokenAddress: minionTransaction.tokenAddress,
            txExplorerLink,
            ...balances,
          }
        })
      )
      return treasuryTransactions
    }

    const mapMinionTokenBalancesToTokenBalanceLineItem = async (
      minionTokenBalances: TokenBalance[],
      calculatedTokenBalances: CalculatedTokenBalances
    ): Promise<TokenBalanceLineItem[]> => {
      const tokenBalanceLineItems = await Promise.all(
        minionTokenBalances.map(async (molochTokenBalance) => {
          const usdValue = await convertTokenValueToUSD(molochTokenBalance)

          const tokenValue = convertTokenToValue(
            molochTokenBalance.tokenBalance,
            molochTokenBalance.token.decimals
          )

          const tokenExplorerLink = getTokenExplorer(
            daoMeta.network,
            molochTokenBalance.token.tokenAddress
          )

          return {
            ...molochTokenBalance,
            tokenExplorerLink,
            inflow: {
              tokenValue:
                calculatedTokenBalances[molochTokenBalance.token.tokenAddress]
                  ?.in || 0,
              usdValue:
                calculatedTokenBalances[molochTokenBalance.token.tokenAddress]
                  ?.usdIn || 0,
            },
            outflow: {
              tokenValue:
                calculatedTokenBalances[molochTokenBalance.token.tokenAddress]
                  ?.out || 0,
              usdValue:
                calculatedTokenBalances[molochTokenBalance.token.tokenAddress]
                  ?.usdOut || 0,
            },
            closing: {
              tokenValue,
              usdValue,
            },
          }
        })
      )
      return tokenBalanceLineItems
    }

    const minionTransactions = await mapMinionTransactionsToTreasuryTransaction(
      minion.transactions
    )

    const tokenBalances = await mapMinionTokenBalancesToTokenBalanceLineItem(
      minion.tokenBalances,
      calculatedTokenBalances
    )

    const combinedFlows = { inflow: 0, outflow: 0, closing: 0 }

    tokenBalances.forEach((tokenBalance) => {
      combinedFlows.inflow += tokenBalance.inflow.usdValue
      combinedFlows.outflow += tokenBalance.outflow.usdValue
      combinedFlows.closing += tokenBalance.closing.usdValue
    })

    return {
      props: {
        daoMetadata: daoMeta,
        transactions: minionTransactions,
        tokenBalances: orderBy(
          tokenBalances,
          ['closing.usdValue', 'closing.tokenValue'],
          ['desc', 'desc']
        ),
        combinedFlows,
        vaultName: minion.name,
      },
    }
  } catch (error) {
    return {
      props: {
        error: {
          message: (error as Error).message,
        },
      },
    }
  }
}