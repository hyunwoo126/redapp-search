require('./modules/polyfill')();
const makeCancelable = require('./modules/makeCancelablePromise');

import React from 'react';
import ReactDOM from 'react-dom';

const prettyNum = function(x){
    if(typeof x != 'number'){ return x; }
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function SearchResultApps(props){
    function makeImg(url){
        //space.gif lazyload.gif app_default.png app-icon-default.png
        if(url.endsWith('space.gif') || url.endsWith('lazyload.gif')){
            return '';
        }
        else if(url){
            return <img src={url}/>;
        } else {
            return '';
        }
    }

    if(props.list.length < 1){
        return <li>No results.</li>;
    } else {
        return (props.list.map((app, i)=>{
            return (
                <li key={i} className="li_hit">
                    <div className="inline-block li_hit_icon">
                        {makeImg(app.icon)}
                    </div>
                    <div className="inline-block">
                        <h5>{app.name}</h5>
                        <div>downloads: {app.downloads ? prettyNum(app.downloads) : 'Not Available'}</div>
                    </div>
                    <a href={app.link} target="_blank" className="li_hit_appLink">
                        {app.link ? 'open in app store' : ''}
                    </a>
                </li>
            );
        }));
    }
}

class SearchResultStores extends React.Component{
    renderByStores(){
        var that = this;
        return (this.props.searchResult.map((store, i)=>{
            return(
                <li key={i} className="li_store" id={"anchor_"+store.store}>
                    <a href={this.props.storeInfo[store.store].homeUrl} className="storeHeading" target="_blank">
                        <h3><img src={"img/stores/"+store.store+".png"}/> {store.store}</h3>
                    </a>
                    <ul>
                        <SearchResultApps 
                            list = {store.result}
                        />
                    </ul>
                </li>
            );
        }));
    }

    render(){
        return (
            <ul className="app_list">
                {this.renderByStores()}
            </ul>
        );
    }
}

class StoreStatus extends React.Component{
    scrollTo_anchor(id){
        if(Velocity){
            Velocity(document.getElementById(id), "scroll", { duration: 200, easing: "ease-out" });
        }
        else {
            document.getElementById(id).scrollIntoView();
        }
    }
    render(){
        var store = this.props.store;
        return(
        <span className={"storeStatus "+this.props.status} onClick={()=> this.scrollTo_anchor("anchor_"+store)}>
            {store}
            <i className="fa fa-spinner fa-pulse fa-fw"></i>
            <i className="fa fa-check"></i>
            <i className="fa fa-close"></i>
        </span>
        );
    }
}

class StoreStatusBar extends React.Component{
    render(){
        if(this.props.landing){ return ''; }
        var stores = [];
        for(var store in this.props.stores){
            var status = this.props.stores[store].status;
            stores.push(
                <StoreStatus
                    key={store}
                    store={store}
                    status={status}
                />
            );
        }
        return <div>{stores}</div>;
    }
}

class App extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            landing: true,
            stores: {
                xiaomi: {
                    homeUrl: 'http://app.xiaomi.com',
                    status: 'waiting',
                },
                tencent: {
                    homeUrl: 'http://android.myapp.com',
                    status: 'waiting',
                },
                baidu: {
                    homeUrl: 'http://shouji.baidu.com',
                    status: 'waiting',
                },
                360: {
                    homeUrl: 'http://zhushou.360.cn',
                    status: 'waiting',
                },
                huawei: {
                    homeUrl: 'http://appstore.huawei.com',
                    status: 'waiting',
                },
                wandoujia: {
                    homeUrl: 'http://wandoujia.com',
                    status: 'waiting',
                },
                // oppo: {
                //     status: 'waiting',
                // },
                pp: {
                    homeUrl: 'https://pro.25pp.com',
                    status: 'waiting',
                },
                anzhi: {
                    homeUrl: 'http://anzhi.com',
                    status: 'waiting',
                },
                meizu: {
                    homeUrl: 'http://app.meizu.com',
                    status: 'waiting',
                },
                lenovo: {
                    homeUrl: 'http://app.lenovo.com',
                    status: 'waiting',
                },
            },
            searchRequests: [],
            currentTerm: '',
            searchTerm: '',
            searching: false,
            searchResult: [],
            totalDL: 0,
            hits: 0,
        }
    }

    clearSearch(){
        var requests = this.state.searchRequests;
        if(requests.length > 0){
            for(var i in requests){
                requests[i].cancel();
            }
        }
        this.state.searchRequests = [];
        
        var stores = this.state.stores;
        for(var store in stores){
            stores[store].status = 'waiting';
        }

        this.setState({
            searchRequests: [],
            stores: stores,
            searchTerm: '',
            searchResult:[],
            hits: 0,
            totalDL: 0,
        });
    }


    search(){
        const searchTerm = this.state.currentTerm;
        if(searchTerm == ''){ return; }
        this.clearSearch();
        this.setState({
            searchTerm: searchTerm,
            searching: true, 
            landing: false
        });
        
        var that = this;
        var promises = [];
        for(let store in this.state.stores){

            let cancelablePromise = makeCancelable(fetch("/search", {
                method: "POST",
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    store: store,
                    appName: searchTerm,
                })
            }));

            cancelablePromise.promise
            .then((resp) => resp.json())
            .then(function(data){
                if(data.error === true){
                    throw new Error('data.error == true');
                } else {
                    var dl = that.state.totalDL;
                    var hits = that.state.hits;
                    for(var i in data.result){
                        hits++; dl += data.result[i].downloads;
                    }

                    var result = that.state.searchResult;
                    result.push(data);
                    var stores = that.state.stores;
                    stores[data.store].status = 'success';
                    that.setState({
                        stores: stores,
                        searchResult: result,
                        hits: hits, totalDL: dl,
                    });
                }
            })
            .catch(function(error){
                if(error.isCanceled){
                    //do nothing
                } else {
                    var stores = that.state.stores;
                    stores[store].status = 'failed';
                    that.setState({stores: stores});
                }
            });
            
            let requests = this.state.searchRequests;
            requests.push(cancelablePromise);
            this.setState({
                searchRequests: requests
            });
            promises.push(cancelablePromise.promise);
        }

        Promise.all(promises).then(function(results){
            that.setState({searching: false});
        }).catch(function(error){
            if(!error.isCanceled){
                console.error(error);
            }
        });
        
    }

    handleInputChange(e){
        this.setState({ currentTerm: e.target.value });
    }
    handleKeypress(e){
        if(e.which == 13){ this.search(); }
    }

    renderResultSummary(){
        if(this.state.landing){
            return '';
        } else {
            return (
            <div className="resultSummary">
                Your search query for <strong>'{this.state.searchTerm}' </strong>
                returned <strong>{this.state.hits}</strong> hits
                with total of <strong>{prettyNum(this.state.totalDL)}</strong> cumulative downloads.
            </div>
            );
        }
    }

    renderSearchbar(){
        return (
            <div className="searchbar">
                <input type="text" placeholder="try 微信 or QQ" autoFocus="true" className="base_boxshadow_1"
                    onChange={(event) => this.handleInputChange(event)} 
                    onKeyPress={(event) => this.handleKeypress(event)}
                />
                <button onClick= {() => this.search()}>
                <i className="fa fa-search" aria-hidden="true"></i>
                </button>
            </div>
        );
    }


    render(){
        return(
            <div className={'app' + (this.state.landing ? ' landing' : '') }>
                <div className="app_top">
                    <center>
                        <h1>China's Android Market</h1>
                        {this.renderSearchbar()}
                        <img src="img/bg.jpg"/>
                        <StoreStatusBar landing={this.state.landing} stores={this.state.stores}/>
                    </center>
                    {this.renderResultSummary()}
                </div>
                <SearchResultStores
                    storeInfo={this.state.stores}
                    searchResult={this.state.searchResult}
                />
            </div>
        );

    }
}

ReactDOM.render(
    <App />,
    document.getElementById('app')
);