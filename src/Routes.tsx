import { Route, Switch } from 'react-router-dom'
import { VisPage } from './components/pages/VisPage'
import ScrollToTop from './utils/scrollToTop'

const routes = [
  {
    path: '/',
    component: VisPage,
    exact: true,
    key: 'index',
  },
]

export default function Routes() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        {routes.map((props) => (
          <Route {...props} />
        ))}
      </Switch>
    </>
  )
}
