import React, {Component, PureComponent} from 'react'
import ShopList from './ShopList/'
import MyShop from './MyShop'
import shops from '../shops'
import {getDistanceFromLatLon} from './GetDistanceFromLatLon';
import Select from "react-select";

const _ = require('lodash');


class App extends PureComponent {

    // state = {
    //     reverted: false
    // }

    constructor(props) {
        super(props);
        this.state = {
            error: null,
            dataLoaded: false,
            ip: null,
            location: {},
            myStore: null,
            shops: [],
            filteredStores: [],
            userForceCheckStore: false,
            filters: [
                {
                    name: 'distance',
                    val: null
                },
                {
                    name: 'storeType',
                    val: null
                }
            ]
        };

        this.storageKey = 'pedegoMyStore';
    }

    handleFilterChange(filterName) {

        let self = this;

        let currentFilters = this.state.filters,
            filteredStores = this.state.shops;

        return function (filterVal) {
            currentFilters.forEach(function(filter){
                if (filter.name === filterName) {
                    filter.val = filterVal.value;

                    self.setState({
                        filters: currentFilters
                    }, function(){
                        console.log(this.state)
                    })
                }
            })


            this.state.filters.forEach(function(filter){
                if (filter.val === null || filter.val === -1) return;

                if (filter.name === 'distance') {
                    filteredStores = _.filter(filteredStores, function(item) {return item.distance < filter.val})
                }

                else if (filter.name === 'storeType') {
                    filteredStores = _.filter(filteredStores, function(item) {return item.storeTypeID === filter.val})
                }
            })

            self.setState({
                filteredStores: filteredStores
            })

        }.bind(this);



        // console.log(distanceFilterVal);
        //
        // let filters = this.state.filters;
        //
        // filters.distance = distanceFilterVal;
        //
        // this.setState(filters);
        //
        // // selectedOption can be null when the `x` (close) button is clicked
        // if (distanceFilterVal) {
        //     console.log(`Selected: ${distanceFilterVal.label}`);
        // }
    }

    componentDidMount() {

        let promiseArr = [];

        promiseArr.push(new Promise((resolve, reject) => {
            setTimeout(() => {
                this.setState({
                    shops: shops
                })
                resolve("Shops loaded");
            }, 1000);

        }));


        if (this.getStorageData() === null) {
            promiseArr.push(fetch("https://json.geoiplookup.io/api")
                .then(res => res.json())
                .then(
                    (result) => {
                        this.setState({
                            ip: result.ip
                        });

                        const {ip} = this.state;

                        return fetch("http://api.ipstack.com/" + ip + "?access_key=7d397b1c07df95585a1bb05dd8ba894e")
                            .then(res => res.json())
                            .then(
                                (result) => {
                                    this.setUserLocation({latitude: result.latitude, longitude: result.longitude});

                                    return result;
                                },
                                // Note: it's important to handle errors here
                                // instead of a catch() block so that we don't swallow
                                // exceptions from actual bugs in components.
                                (error) => {
                                    this.setState({
                                        error
                                    });
                                }
                            )
                    },

                    (error) => {
                        this.setState({
                            error
                        });
                    }
                )
            )
        }

        else {
            this.pullFromStorage();
        }

        Promise.all(promiseArr).then(values => {

            this.setShopDistance();
            this.sortShopByDistance();
            this.initFilteredShops();

            if (!this.state.userForceCheckStore) {
                this.setMyStore(this.state.shops[0].id);
            }

            this.setState({
                dataLoaded: true
            })

            this.pushToStorage();
        });
    }

    initFilteredShops() {

        let self = this;

        // let filteredStores = this.state.shops;

        // console.log(this.state);

        // for(let filter in this.state.filters) {
        //
        //     if (filter === 'distance') {
        //         filteredStores = _.filter(filteredStores, function(item) {return item.distance < self.state.filters[filter].val})
        //     }
        // }

        // this.state.filters.forEach(function (filter) {
        //     console.log(filter)
        // })
        // filteredStores = _.filter(filteredStores)

        this.setState({
            filteredStores: this.state.shops
        })
    }

    pullFromStorage() {
        let storageData = this.getStorageData();

        this.setState({
            location: storageData.location,
            myStore: storageData.myStore,
            userForceCheckStore: storageData.userForceCheckStore
        });
    }

    pushToStorage() {
        let storageData = {
            location: this.state.location,
            myStore: this.state.myStore,
            userForceCheckStore: this.state.userForceCheckStore
        }

        sessionStorage.setItem(this.storageKey, JSON.stringify(storageData));
    }

    setUserLocation(location) {
        this.setState({
            location: {latitude: location.latitude, longitude: location.longitude}
        });
    }

    setMyStore(storeID) {
        let self = this;

        this.state.shops.forEach(function (store) {
            if (store.id === storeID) {
                self.setState({
                    myStore: store
                }, () => self.pushToStorage());
            }
        })
    }

    onMakeMyStoreClick(storeID) {

        this.state.userForceCheckStore = true;
        this.setMyStore(storeID);
    }

    setShopDistance() {
        const {location, shops} = this.state;

        shops.forEach(function (shop) {
            shop.distance = getDistanceFromLatLon(location.latitude, location.longitude, shop.lat, shop.lng);
        })
    }

    sortShopByDistance() {
        this.state.shops = _.sortBy(this.state.shops, ['distance'])
    }


    getStorageData() {
        return JSON.parse(sessionStorage.getItem(this.storageKey));
    }

    render() {
        const {error, dataLoaded, ip, location, distanceFilterVal} = this.state;

        if (error) {
            return <div>Error: {error.message}</div>;
        } else if (!dataLoaded) {
            return <div>Loading...</div>;
        } else {

            return (

                <div>
                    <p>
                        Your ip: {ip}
                    </p>

                    <p>
                        Your location: {location.latitude} {location.longitude}
                    </p>

                    My store:

                    <MyShop shop={this.state.myStore}/>

                    Nearest store:
                    <ShopList
                        shops={this.state.filteredStores}
                        activeStoreID={this.state.myStore.id}
                        onMakeMyStoreClick={this.onMakeMyStoreClick.bind(this)}

                    />

                    <Select
                        name="distance-filter"
                        onChange={this.handleFilterChange('distance').bind(this)}
                        options={[
                            {value: -1, label: "All Stores"},
                            {value: 1, label: 1},
                            {value: 5, label: 5},
                            {value: 10, label: 10}
                        ]}
                    />

                    <Select
                        name="store-type-filter"
                        onChange={this.handleFilterChange('storeType').bind(this)}
                        options={[
                            {value: -1, label: "All Stores"},
                            {value: 0, label: "Pedego Stores"},
                            {value: 1, label: "Independent Stores"}
                        ]}
                    />

                </div>


            );
        }
    }

}

export default App