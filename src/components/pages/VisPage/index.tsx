import { Button } from '@chakra-ui/button'
import { Stack } from '@chakra-ui/layout'
import { Select, HStack, VStack } from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'

import ForceGraph from './forceGraph'
import { getGraphProps } from './getGraphProps'

import { LoadingLogo } from '@/components'
// import { Error } from '@/components/Error'
import { DaoMetadata } from '@/hooks/useDaoMetadata/types'
import { Moloch } from '@/types/DAO'

type daoObject = {
  daoMetadata?: DaoMetadata[]
  moloch?: Moloch[]
  hidden: boolean
}

export const VisPage = (): JSX.Element => {
  // filter members (ragequit, jailed, new membership?)

  const [apiData, setApiData] = useState()
  const [nodes, setNodes] = useState()
  const [links, setLinks] = useState()
  const [loading, setLoading] = useState(false)
  const [chainFilter, setChainFilter] = useState()
  const [daoSelected, setDaoSelected] = useState()
  const [dataHolder, setDataHolder] = useState<daoObject[]>()
  //--------------------------------- TODO LIST

  //--------------------------------- DATA TO APP
  const [list, setList] = useState([
    '0xef3d8c4fbb1860fceab16595db7e650cd5ad51c1', // starter (daoHausWarcamp)
  ])
  const getApiMetadata = async () => {
    try {
      const response = await fetch(
        'https://daohaus-metadata.s3.amazonaws.com/daoMeta.json'
      )
      return response.json()
    } catch (err) {
      console.error(err)
    }
  }
  //--------------------------------- DATA FILTERS

  const filteredDaos = (chain) => {
    if (apiData) {
      const filteredChainDAOs = Object.values(apiData).filter((x) => {
        return x[0].network === chainFilter
      })
      return filteredChainDAOs
    }
  }

  //--------------------------------- DATA TO GRAPH
  const updateProps = async () => {
    const totalPromises = []
    list.forEach((x) => {
      totalPromises.push(getGraphProps(x))
    })
    Promise.all(totalPromises).then((results) => {
      setDataHolder(results)
    })
  }

  async function addDao(daoAddress) {
    const newData = await getGraphProps(daoAddress)
    if (!newData.error) {
      // handle errors! there are many groups with no member, no moloch, etc
      // moloch v1 has no image and does not handle that
      const newArray = dataHolder.concat(newData)
      setDataHolder(newArray)
    }
  }

  function createData(data) {
    const nnodes = data.moloch.members.map((x) => {
      return {
        id: x.memberAddress,
        label: x.memberAddress, // ENS would be just.. great..

        group: 3,
        size: 2,
        shares: x.shares,
        loot: x.loot,
      }
    })
    const nlinks = nnodes.map((x) => {
      return {
        source: data.daoMetadata.contractAddress,
        target: x.id,
        value: 1,
      }
    })
    nnodes.push({
      id: data?.daoMetadata?.contractAddress,
      label: data?.daoMetadata?.name,
      image: data?.daoMetadata?.avatarImg,
      group: 0,
      size: 10,
    })
    return { nnodes, nlinks }
  }

  useEffect(() => {
    const acumNodes = []
    const acumLinks = []
    if (dataHolder) {
      const viewList = dataHolder.filter((x) => x.hidden === false)
      for (let i = 0; i < viewList.length; i++) {
        const { nnodes, nlinks } = createData(viewList[i])
        acumNodes.push(nnodes)
        acumLinks.push(nlinks)
      }
      const uniqueNodes = acumNodes.flat().reduce((unique, o) => {
        if (!unique.some((obj) => obj.id === o.id)) {
          unique.push(o)
        }
        return unique
      }, [])
      setNodes(uniqueNodes)
      setLinks(acumLinks.flat())
    }
  }, [dataHolder])

  useEffect(async () => {
    setLoading(true)
    const daoHausMetadata = await getApiMetadata()
    if (daoHausMetadata) {
      // maybe use session storage to make it faster
      setApiData(daoHausMetadata)
    }
    updateProps()
    setLoading(false)
  }, [])

  return (
    <Stack spacing="8">
      <Helmet>
        <title> DAO Vis Tool</title>
      </Helmet>
      {loading && <LoadingLogo />}
      <HStack>
        <VStack>
          <Select
            style={{
              color: 'white',
              backgroundColor: 'transparent',
            }}
            onChange={(e) => {
              console.log(`add other filter options! ${e}`)
            }}
          >
            <option value="DAO">DAO</option>
          </Select>
          <Select
            placeholder="select a chain"
            style={{
              color: 'white',
              backgroundColor: 'transparent',
            }}
            onChange={(e) => {
              setChainFilter(e.target.value)
            }}
          >
            <option value="all">all</option>
            <option value="matic">matic</option>
            <option value="arbitrum">arbitrum</option>
            <option value="mainnet">mainnet</option>
            <option value="rinkeby">rinkeby</option>
            <option value="kovan">kovan</option>
            <option value="xdai">xdai</option>
          </Select>
          {apiData && (
            <Select
              placeholder="select a DAO"
              style={{
                color: 'white',
                backgroundColor: 'transparent',
              }}
              onChange={(e) => {
                setDaoSelected(e.target.value)
              }}
            >
              {filteredDaos(chainFilter).map((x) => {
                return (
                  <option
                    key={x[0].contractAddress}
                    value={x[0].contractAddress}
                  >
                    {x[0].name}
                  </option>
                )
              })}
            </Select>
          )}

          <Button
            type="submit"
            variant="outline"
            disabled={!daoSelected}
            onClick={() => {
              addDao(daoSelected)
            }}
          >
            Add
          </Button>
          {dataHolder?.length && (
            <div>
              {dataHolder.map((i, index) => {
                return (
                  <div key={index} style={{ color: 'white' }}>
                    {i?.daoMetadata?.name}
                    <Button
                      type=""
                      style={{ marginLeft: '16px' }}
                      variant="outline"
                      onClick={() => {
                        setDataHolder(
                          dataHolder.map((el, item) =>
                            item === index ? { ...el, hidden: !el.hidden } : el
                          )
                        )
                      }}
                    >
                      {dataHolder[index].hidden ? 'Unhide' : 'Hide'}
                    </Button>
                    <Button
                      type=""
                      variant="outline"
                      onClick={() => {
                        setList(list.filter((_, i) => i !== index))
                        setDataHolder(dataHolder.filter((_, i) => i !== index))
                      }}
                    >
                      Out
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </VStack>
        <ForceGraph nodes={nodes} links={links} />
      </HStack>
    </Stack>
  )
}
