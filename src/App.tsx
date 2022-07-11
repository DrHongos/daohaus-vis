import { Box, Flex } from '@chakra-ui/layout'
import { Helmet } from 'react-helmet-async'
import { SWRConfig } from 'swr'

import Routes from './Routes'

import { useCustomTheme } from './contexts/CustomThemeContext'
import { getImageFromIPFSHash } from './utils/web3/ipfs'

function App() {
  const { theme } = useCustomTheme()
  return (
    <SWRConfig
      value={{
        fetcher: fetch,
        shouldRetryOnError: false,
        revalidateOnFocus: false,
      }}
    >
      <Helmet>
        <title>DAOHAUS 3D!</title>
        <meta
          name="description"
          content="Visualization tool for moloch DAOs from https://daohaus.club/"
        />
      </Helmet>
      <Flex direction="column" bg="brand.darkBlue2" height="full">
        <Box sx={{ minHeight: '100vh' }} flex="1" overflowY="auto">
          <Flex direction="column" pt="20">
            <Box
              sx={{ minHeight: 'calc(100vh - 5rem)' }}
              bgImage={getImageFromIPFSHash(theme?.images?.bg)}
              backgroundSize="100%"
            >
              <Box
                sx={{ minHeight: 'calc(100vh - 5rem)' }}
                p="9"
                backdropFilter={
                  theme?.images?.bg &&
                  `brightness(${theme?.images?.bgOpacity?.toString()}%)`
                }
              >
                <Routes />
              </Box>
            </Box>
          </Flex>
        </Box>
      </Flex>
    </SWRConfig>
  )
}

export default App
