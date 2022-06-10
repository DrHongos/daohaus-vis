import { getDAOMetadata } from '@/services/getDAOMetadata'
import { Moloch } from '@/types/DAO'
import fetchGraph from '@/utils/web3/fetchGraph'

const GET_MOLOCH_MEMBERS = `
query moloch($contractAddr: String!) {
  moloch(id: $contractAddr, first: 200) {
    id
    totalShares
    totalLoot
    members{
      id
      createdAt
      molochAddress
      memberAddress
      delegateKey
      shares
      loot
      exists
      didRagequit
      kicked
    }
  }
}
`
// add proposals and votes
// continue from here: https://daohaus.club/docs/devs/subgraphs

// what about multi moloch graphs?
// https://www.tabnine.com/blog/understanding-graphql-filters/
type MolochData = {
  moloch: Moloch
}
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const getGraphProps = async (daoAddress: string) => {
  try {
    const daoMeta = await getDAOMetadata(daoAddress as string)
    const moloch = await fetchGraph<MolochData, { contractAddr: string }>(
      daoMeta.network,
      GET_MOLOCH_MEMBERS,
      {
        contractAddr: daoMeta.contractAddress,
      }
    )
    return {
      daoMetadata: daoMeta,
      moloch: moloch.data.moloch,
      hidden: false,
    }
  } catch (error) {
    return {
      error: {
        message: (error as Error).message,
      },
    }
  }
}
