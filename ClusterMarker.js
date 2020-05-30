import React  from 'react'
export default class ClusterMarker extends React.PureComponent {
  constructor(props) {
    super(props)
    this.onPress = this.onPress.bind(this)
  }
  onPress() {
    this.props.onPress(this.props)
  }

  render() {
    const pointCount = this.props.properties.point_count // eslint-disable-line camelcase
    const latitude = this.props.geometry.coordinates[1],
        longitude = this.props.geometry.coordinates[0]

    if (this.props.renderCluster) {
      const cluster = {
        pointCount,
        coordinate: { latitude, longitude },
        clusterId: this.props.properties.cluster_id,
      }
      return this.props.renderCluster(cluster, this.onPress)
    }

    throw "Implement renderCluster method prop to render correctly cluster marker!"
  }
}
