import React, { PureComponent } from 'react'
import {
  Platform,
  Dimensions,
  LayoutAnimation
} from 'react-native'
// map-related libs
import MapView from 'react-native-maps'
import SuperCluster from 'supercluster'
import GeoViewport from '@mapbox/geo-viewport'
// components / views
import ClusterMarker from './ClusterMarker'
// libs / utils
import {
  regionToBoundingBox,
  itemToGeoJSONFeature,
  getCoordinatesFromItem,
} from './util'

export default class ClusteredMapView extends PureComponent {

  constructor(props) {
    super(props)

    this.state = {
      data: [], // helds renderable clusters and markers
      region: props.region || props.initialRegion, // helds current map region
    }

    this.isAndroid = Platform.OS === 'android'
    this.dimensions = [props.width, props.height]
    this.mapRef = this.mapRef.bind(this)
    this.onClusterPress = this.onClusterPress.bind(this)
    this.onRegionChangeComplete = this.onRegionChangeComplete.bind(this)
    this.clusterize=this.clusterize.bind(this);
  }

  componentDidMount() {
    this.mounted=true;
    this.clusterize(this.props.data)
  }
  componentWillUnmount(): void {
    this.mounted=false
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (this.props.data !== nextProps.data)
      this.clusterize(nextProps.data)
  }

  // componentDidUpdate(nextProps, nextState) {
  //   if (!this.isAndroid && this.props.animateClusters && this.clustersChanged(nextState))
  //     LayoutAnimation.configureNext(this.props.layoutAnimationConf)
  // }

  mapRef(ref) {
    this.mapview = ref
  }

  getMapRef() {
    return this.mapview
  }

  getClusteringEngine() {
    return this.index
  }

  clusterize(dataset) {
    this.index = new SuperCluster({ // eslint-disable-line new-cap
      extent: this.props.extent,
      minZoom: this.props.minZoom,
      maxZoom: this.props.maxZoom,
      radius: this.props.radius || (this.dimensions[0] * .045), // 4.5% of screen width
    });

    // get formatted GeoPoints for cluster
    let rawData = []
    for (let i=0;i<dataset.length;i++){
      rawData.push(itemToGeoJSONFeature(dataset[i], this.props.accessor))
    }
    // load geopoints into SuperCluster
    this.index.load(rawData)
    let data = this.getClusters(this.state.region)
    if(this.mounted){
      this.setState({ data },()=>{
        rawData=null;
        data=null;
        dataset=null;
      })
    }
  }

  clustersChanged(nextState) {
    return this.state.data.length !== nextState.data.length
  }

  onRegionChangeComplete(region) {
    let data = this.getClusters(region)
    if(this.mounted && data) {
      this.setState({region, data}, () => {
        this.props.onRegionChangeComplete && this.props.onRegionChangeComplete(region, data)
        data=null
      })
    }
  }

  getClusters(region) {
    if(this.index) {
      const bbox = regionToBoundingBox(region);
      const viewport = (region.longitudeDelta) >= 40 ? {zoom: this.props.minZoom} : GeoViewport.viewport(bbox, this.dimensions)
      return this.index.getClusters(bbox, viewport.zoom)
    }
    return null
  }

  onClusterPress(cluster) {
    // cluster press behavior might be extremely custom.
    if (!this.props.preserveClusterPressBehavior) {
      this.props.onClusterPress && this.props.onClusterPress(cluster.properties.cluster_id)
      return
    }
    // //////////////////////////////////////////////////////////////////////////////////
    // NEW IMPLEMENTATION (with fitToCoordinates)
    // //////////////////////////////////////////////////////////////////////////////////
    // get cluster children
    const children = this.index.getLeaves(cluster.properties.cluster_id, this.props.clusterPressMaxChildren)
    const markers = [];
    for (let i=0;i<children.length;i++){
      markers.push(children[i].properties.item)
    }

    const coordinates = [];

    for (let i =0;i<markers.length;i++){
      coordinates.push(getCoordinatesFromItem(markers[i], this.props.accessor, false))
    }

    // fit right around them, considering edge padding
    this.mapview.fitToCoordinates(coordinates, { edgePadding: this.props.edgePadding })

    this.props.onClusterPress && this.props.onClusterPress(cluster.properties.cluster_id, markers)
  }

  render() {
    const { style, ...props } = this.props

    return (
        <MapView
    {...props}
    style={style}
    ref={this.mapRef}
    onRegionChangeComplete={this.onRegionChangeComplete}>
        {
          this.props.clusteringEnabled && this.state.data.map((d) => {
            if (d.properties.point_count === 0){
              return this.props.renderMarker(d.properties.item)
            }
            return (
                <ClusterMarker
            {...d}
            onPress={this.onClusterPress}
            renderCluster={this.props.renderCluster}
            key={`cluster_${d.properties.cluster_id}`} />
          )
          })
        }
    {
      !this.props.clusteringEnabled && this.props.data.map(d => this.props.renderMarker(d))
    }
    {this.props.children}
  </MapView>
  )
  }
}

ClusteredMapView.defaultProps = {
  minZoom: 0,
  maxZoom: 14,
  radius: 42.5,
  extent: 512,
  accessor: 'location',
  animateClusters: true,
  clusteringEnabled: true,
  clusterPressMaxChildren: 100,
  preserveClusterPressBehavior: true,
  width: Dimensions.get('window').width,
  height: Dimensions.get('window').height,
  layoutAnimationConf: LayoutAnimation.Presets.spring,
  edgePadding: { top: 10, left: 10, right: 10, bottom: 10 }
}

