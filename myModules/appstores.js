const cheerio = require('cheerio');
const request = require('request');
const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();

var cleanDownloadStr = function(str_ori){
	if(typeof str_ori == 'number'){ return str_ori; }
	else if(typeof str_ori != 'string'){ return false; }
	str_ori = str_ori.toLowerCase();
	var str_clean = str_ori.replace(/(([0-9]*[.])?[0-9]+mb|kb)|(次|下载|安装|:|：)|(\s)/g, "");
	var count = parseFloat(str_clean) | 0;
	
	var m = 1;
	if(str_clean.indexOf('亿') > -1){ m *= 100000000; }
	if(str_clean.indexOf('万') > -1){ m *= 10000; }
	if(str_clean.indexOf('千') > -1){ m *= 1000;	}
	if(str_clean.indexOf('白') > -1){ m *= 100; }

	return count*m;
}

var genDataObj = function(nameTarget, nameFound, strDL, iconLink, author, desc, link){
    if(!nameFound | typeof nameFound != 'string' | typeof nameTarget != 'string'){ return false; }
    nameFound = nameFound.replace(/(\s)/g, "");
    var nameFound_lc = nameFound.toLowerCase();
    var nameTarget_lc = nameTarget.toLowerCase();
    if(nameFound_lc.indexOf(nameTarget_lc) == -1){
        return false;
    }

    return {
        name: nameFound,
        downloads: cleanDownloadStr(strDL),
        exactMatch: nameFound_lc == nameTarget_lc ? true : false,
        icon: iconLink || false,
        author: author || false,
        desc: desc || false,
        link: link || false,
    }
}

const respError = function(parentRes, obj){
    obj.error = true;
    parentRes.send(obj);
}


//yes dl count
exports.tencent = function(appName, parentRes){
    request.post({
        url:'http://sj.qq.com/myapp/searchAjax.htm',
        qs:{
            kw: appName,
        }, 
        json:true
        }, 
    function (error, response, body) {
        console.log('<<<< tencent >>>>');
        var objRes = {
            error: false,
            store: 'tencent',
            result: [],
        }
        if(error){ respError(parentRes, objRes); } 
        else {
            try{
                var items = body.obj.items;
                for(var i = 0; i < items.length; i++){
                    var detail = items[i].appDetail;
                    var data = genDataObj(
                        appName, 
                        detail.appName, 
                        detail.appDownCount, 
                        detail.iconUrl,
                        detail.authorName,
                        detail.description,
                        'http://android.myapp.com/myapp/detail.htm?apkName='+detail.pkgName
                    );
                    if(data){ objRes.result.push(data); }
                }
                console.log('--tencent success--');
                parentRes.send(objRes);
            } 
            catch(error){ console.log(error); respError(parentRes, objRes); }           
        }
    });
}

//no dl count
//based on desktop web store app.mi.com
exports.xiaomi_old = function(appName, parentRes){
    request.get({
            url:'http://app.mi.com/searchAll?keywords='+encodeURI(appName)+'&typeall=phone',
        }, 
        function (error, response, body) {
            console.log('<<<< xiaomi >>>>');
            var objRes = {
                error: false,
                store: 'xiaomi',
                result: [],
            }
            if(error){ respError(parentRes, objRes); } 
            else {
                try{
                    var $ = cheerio.load(body);
                    var items = $('ul.applist > li');
                    for(var i = 0; i < items.length; i++){
                        var $item = $(items[i]);
                        var name = $item.find('h5').text();
                        var icon = $item.find('img').prop('src');
                        var link = 'http://app.mi.com'+$item.find('h5 a').prop('href');
                        var data = genDataObj(
                            appName, 
                            name, 
                            false,
                            icon,
                            false,
                            false,
                            link
                        );
                        if(data){ objRes.result.push(data); }
                    }
                    console.log('--xiaomi success--');
                    parentRes.send(objRes);
                } 
                catch(error){ console.log(error); respError(parentRes, objRes); }           
            }            
        }
    );
}

//no dl count
//based on mobile web store m.app.mi.com
exports.xiaomi = function(appName, parentRes){
    request.get({
        url:'http://m.app.mi.com/searchapi?keywords='+encodeURI(appName)+'&pageIndex=0&pageSize=10',
        headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'User-Agent': '',
        },
        json: true,
    }, function (error, response, body) {
        console.log('<<<< xiaomi >>>>');
        var objRes = {
            error: false,
            store: 'xiaomi',
            result: [],
        }
        if(error){ respError(parentRes, objRes); } 
        else {
            try{
                var items = body.data;
                for(var i = 0; i < items.length; i++){
                    var item = items[i];
                    var downloads = 0;
                    var data = genDataObj(
                        appName, 
                        item.displayName, 
                        downloads, 
                        item.icon,
                        item.publisherName,
                        false,
                        'http://m.app.mi.com/#page=detail&id='+item.appId                        
                    );
                    if(data){ objRes.result.push(data); }
                }
                console.log('--xiaomi success--');
                parentRes.send(objRes);
            } 
            catch(error){ console.log(error); respError(parentRes, objRes); }           
        }        
    });
}




//approx dl count
exports.baidu = function(appName, parentRes){
    request.get({
            url:'http://shouji.baidu.com/s?wd='+encodeURI(appName),
        }, 
        function (error, response, body) {
            console.log('<<<< baidu >>>>');
            var objRes = {
                error: false,
                store: 'baidu',
                result: [],
            }
            if(error){ respError(parentRes, objRes); } 
            else {
                try{
                    var $ = cheerio.load(body);
                    var items = $('li.app-outer');
                    for(var i = 0; i < items.length; i++){
                        var $item = $(items[i]);
                        var name = $item.find('.app-name').text();
                        var downloads = $item.find('.download-num').text();
                        var icon = $item.find('.icon img').prop('src');
                        var desc = $item.find('.brief').text();
                        var link = 'http://shouji.baidu.com/'+$item.find('.app-name').prop('href');
                        var data = genDataObj(
                            appName, 
                            name, 
                            downloads,
                            icon,
                            false,
                            desc,
                            link
                        );
                        if(data){ objRes.result.push(data); }
                    }
                    console.log('--baidu success--');
                    parentRes.send(objRes);
                } 
                catch(error){ console.log(error); respError(parentRes, objRes); }           
            }            
        }
    );
}

//based on m.app.haosou.com
//approx dl count for large dl
exports['360'] = function(appName, parentRes){
    request.get({
            url:'http://m.app.haosou.com/search/index?q='+encodeURI(appName),
        }, 
        function (error, response, body) {
            console.log('<<<< 360 >>>>');
            var objRes = {
                error: false,
                store: '360',
                result: [],
            }
            if(error){ respError(parentRes, objRes); } 
            else {
                try{
                    var $ = cheerio.load(body);
                    var items = $('li.app-item');
                    for(var i = 0; i < items.length; i++){
                        var $item = $(items[i]);
                        var name = $item.find('.lt-c-tit h2').text();
                        var downloads = $item.find('.lt-c-s-n > span').text();
                        var icon = $item.find('.list-img img').prop('src');
                        var desc = false;
                        var link = 'http://m.app.haosou.com'+$item.attr('data-href');
                        var data = genDataObj(
                            appName, 
                            name, 
                            downloads,
                            icon,
                            false,
                            desc,
                            link
                        );
                        if(data){ objRes.result.push(data); }
                    }
                    console.log('--360 success--');
                    parentRes.send(objRes);
                } 
                catch(error){ console.log(error); respError(parentRes, objRes); }           
            }            
        }
    );
}

//approx dl count for large dl
exports['360_old'] = function(appName, parentRes){
    request.get({
            url:'http://zhushou.360.cn/search/index/?kw='+encodeURI(appName),
        }, 
        function (error, response, body) {
            console.log('<<<< 360 >>>>');
            var objRes = {
                error: false,
                store: '360',
                result: [],
            }
            if(error){ respError(parentRes, objRes); } 
            else {
                try{
                    var $ = cheerio.load(body);
                    var items = $('.main ul>li');
                    for(var i = 0; i < items.length; i++){
                        var $item = $(items[i]);
                        var name = $item.find('h3').text();
                        var downloads = $item.find('.downNum').text();
                        var icon = $item.find('dl > dt > a > img').prop('src');
                        var desc = $item.find('dd p').text().length ? $item.find('dd p').text() :false;
                        var link = 'http://zhushou.360.cn'+$item.find('dd h3 a').prop('href');
                        var data = genDataObj(
                            appName, 
                            name, 
                            downloads,
                            icon,
                            false,
                            desc,
                            link
                        );
                        if(data){ objRes.result.push(data); }
                    }
                    console.log('--360 success--');
                    parentRes.send(objRes);
                } 
                catch(error){ console.log(error); respError(parentRes, objRes); }           
            }            
        }
    );
}

//based on a.vmall.com
//approx download count
exports.huawei_json = function(appName, parentRes){
    request.get({
            url:'http://a.vmall.com/uowap/index?method=internal.getTabDetail&maxResults=25&reqPageNum=1&serviceType=13&uri=searchApp|'+encodeURI(appName),
            json: true,
        }, 
        function (error, response, body) {
            console.log('<<< huawei >>>');
            var objRes = {
                error: false,
                store: 'huawei',
                result: [],
            }
            if(error){ respError(parentRes, objRes); } 
            else {
                try{
                    var bodyData = body.layoutData;
                    var items = [];
                    for(var j = 0; j < bodyData.length; j++){
                        if(bodyData[j]['dataList-type'] != 3){ continue; }
                        for(var k = 0; k < bodyData[j].dataList.length; k++){
                            items.push(bodyData[j].dataList[k]);
                        }
                    }

                    for(var i = 0; i < items.length; i++){
                        var item = items[i];
                        var name = item.name;
                        var downloads = item.downCountDesc;
                        var icon = item.icon;
                        var desc = item.memo;
                        var link = 'http://appstore.huawei.com/app/'+item.appid;
                        var data = genDataObj(
                            appName, 
                            name, 
                            downloads,
                            icon,
                            false,
                            desc,
                            link
                        );
                        if(data){ objRes.result.push(data); }
                    }
                    parentRes.send(objRes);
                    console.log('--huawei success--');
                } 
                catch(error){ console.log(error); respError(parentRes, objRes); }           
            }
        }
    );
}

//exact dl count
exports.huawei = function(appName, parentRes){
    request.get({
            url:'http://appstore.huawei.com/search/'+encodeURI(appName),
        }, 
        function (error, response, body) {
            console.log('<<< huawei >>>');
            var objRes = {
                error: false,
                store: 'huawei',
                result: [],
            }
            if(error){ respError(parentRes, objRes); } 
            else {
                try{
                    var $ = cheerio.load(body);
                    var items = $('.list-game-app');
                    for(var i = 0; i < items.length; i++){
                        var $item = $(items[i]);
                        var name = $item.find('.title').text();
                        var downloads = $item.find('.app-btn>span').text();
                        var icon = $item.find('.app-ico').prop('src');
                        var desc = $item.find('.game-info-detail p').text();
                        var link = 'http://appstore.huawei.com'+$item.find('.title a').prop('href');
                        var data = genDataObj(
                            appName, 
                            name, 
                            downloads,
                            icon,
                            false,
                            desc,
                            link
                        );
                        if(data){ objRes.result.push(data); }
                    }
                    parentRes.send(objRes);
                    console.log('--huawei success--');
                } 
                catch(error){ console.log(error); respError(parentRes, objRes); }           
            }
        }
    );
}

//exact dl count
/*
exports.wandoujia = function(appName, parentRes){
    var result = [];
    request.post({
        headers: {
            //Origin: 'http://ios.wandoujia.com',
            //Referer: 'http://ios.wandoujia.com/appstore/search/'+appName,
            //'X-Requested-With': 'XMLHttpRequest',
            //'Content-Length': 84,
            'Tunnel-Command': '0xFE306325',
        },
        body: {
            clFlag: 0,
            dcType: 1,
            keyword: appName,
            page: 0,
            pageLimit: 10,
            platform: 2,
            rw: 1
        },
        json: true,
        url: 'https://jsondata.25pp.com/jsondata.html',
    }, function (error, response, body) {
        console.log('<<< wandoujia >>>');
        var objRes = {
            error: false,
            store: 'wandoujia',
            result: [],
        }
        if(error){ respError(parentRes, objRes); } 
        else {
            try{
                console.log(body.content);
                for(var i in body.content){
                    var item = body.content[i];
                    var name = item.title;
                    var downloads = item.down_ac;
                    var icon = item.thumb;
                    var author = item.developer;
                    var desc = item.desc;
                    var link = false;
                    var data = genDataObj(
                        appName, 
                        name, 
                        downloads,
                        icon,
                        author,
                        desc,
                        link
                    );
                    if(data){ objRes.result.push(data); }
                }
                parentRes.send(objRes);
                console.log('--wandoujia success--');
            } 
            catch(error){ console.log(error); respError(parentRes, objRes); }           
        }
    });
}
*/

exports.wandoujia = function(appName, parentRes){
    request.get({
            url:'http://www.wandoujia.com/search?key='+encodeURI(appName)+'&source=index',
        }, 
        function (error, response, body) {
            console.log('<<< wandoujia >>>');
            var objRes = {
                error: false,
                store: 'wandoujia',
                result: [],
            }
            if(error){ respError(parentRes, objRes); } 
            else {
                try{
                    var $ = cheerio.load(body);
                    var items = $('li.search-item');
                    for(var i = 0; i < items.length; i++){
                        var $item = $(items[i]);
                        var name = $item.find('.app-title-h2').text();
                        var downloads = $item.find('.meta').text();
                        var icon = $item.find('.icon-wrap img').prop('src');
                        var desc = $item.find('.comment').text();
                        var link = $item.find('.app-title-h2 a').prop('href');
                        var data = genDataObj(
                            appName, 
                            name, 
                            downloads,
                            icon,
                            false,
                            desc,
                            link
                        );
                        if(data){ objRes.result.push(data); }
                    }
                    parentRes.send(objRes);
                    console.log('--wandoujia success--');
                } 
                catch(error){ console.log(error); respError(parentRes, objRes); }           
            }
        }
    );
}


//based on 25pp.com
//approx for large, exact for small downloads
exports.pp = function(appName, parentRes){
    request.get({
            url: 'https://www.25pp.com/android/search_app/'+encodeURI(appName)+'/',
        }, 
        function (error, response, body) {
            console.log('<<< pp >>>');
            var objRes = {
                error: false,
                store: 'pp',
                result: [],
            }
            if(error){ console.log(error); respError(parentRes, objRes); } 
            else {
                try{
                    var $ = cheerio.load(body);
                    var items = $('ul.app-list-2 > li');
                    for(var i = 0; i < items.length; i++){
                        var $item = $(items[i]);
                        var name = $item.find('.app-info .app-title').text();
                        var downloads = $item.find('.app-info .app-downs').text();
                        var icon = $item.find('.app-icon img').prop('src');
                        var desc = false;
                        var link = 'https://www.25pp.com'+$item.find('.app-info a.app-title').prop('href');
                        var data = genDataObj(
                            appName, 
                            name, 
                            downloads,
                            icon,
                            false,
                            desc,
                            link
                        );
                        if(data){ objRes.result.push(data); }
                    }
                    parentRes.send(objRes);
                    console.log('--pp success--');
                } 
                catch(error){ console.log(error); respError(parentRes, objRes); }           
            }
        }
    );
}

//based on mobile wap.pp.cn
//approx for large, exact for small downloads
exports.pp_old = function(appName, parentRes){
    request.get({
            url:'https://wap.pp.cn/s/?key='+encodeURI(appName),
        }, 
        function (error, response, body) {
            console.log('<<< pp >>>');
            var objRes = {
                error: false,
                store: 'pp',
                result: [],
            }
            if(error){ respError(parentRes, objRes); } 
            else {
                try{
                    var $ = cheerio.load(body);
                    var items = $('.app-list-li');
                    for(var i = 0; i < items.length; i++){
                        var $item = $(items[i]);
                        var name = $item.find('.app-info-name').text();
                        var downloads = $item.find('.app-info-size').text();
                        var icon = $item.find('img.icon').prop('src');
                        var desc = $item.find('.app-info-desc').text();
                        var link = $item.find('a.app-list-link').prop('href');
                        var data = genDataObj(
                            appName, 
                            name, 
                            downloads,
                            icon,
                            false,
                            desc,
                            link
                        );
                        if(data){ objRes.result.push(data); }
                    }
                    parentRes.send(objRes);
                    console.log('--pp success--');
                } 
                catch(error){ console.log(error); respError(parentRes, objRes); }           
            }
        }
    );
}

//approx dl
exports.lenovo = function(appName, parentRes){
    request.get({
            url:'http://www.lenovomm.com/search/index.html?q='+encodeURI(appName),
        }, 
        function (error, response, body) {
            console.log('<<< lenovo >>>');
            var objRes = {
                error: false,
                store: 'lenovo',
                result: [],
            }
            if(error){ respError(parentRes, objRes); } 
            else {
                try{
                    var $ = cheerio.load(body);
                    if(!$('.searchNull').length){
                        var items = $('.appList>li');
                        for(var i = 0; i < items.length; i++){
                            var $item = $(items[i]);
                            var name = $item.find('.appName').text();
                            var downloads = $item.find('.appInfo>p').eq(0).text();
                            var icon = $item.find('.appImg').prop('src');
                            var author = $item.find('.appAuthor').text();
                            var desc = $item.find('.appDes').text();
                            var link = $item.find('.appName a').prop('href');
                            var data = genDataObj(
                                appName, 
                                name, 
                                downloads,
                                icon,
                                author,
                                desc,
                                link
                            );
                            if(data){ objRes.result.push(data); }
                        }
                    }
                    parentRes.send(objRes);
                    console.log('--lenovo success--');
                } 
                catch(error){ console.log(error); respError(parentRes, objRes); }           
            }
        }
    );
}

//exact dls
exports.meizu = function(appName, parentRes){
    request.get({
            url:'http://app.meizu.com/apps/public/search/page?cat_id=1&keyword='+encodeURI(appName)+'&start=0&max=18',
            json: true,
        }, 
        function (error, response, body) {
            console.log('<<< meizu >>>');
            var objRes = {
                error: false,
                store: 'meizu',
                result: [],
            }
            if(error){ respError(parentRes, objRes); } 
            else {
                try{
                    var items = body.value.list;
                    for(var i = 0; i < items.length; i++){
                        var item = items[i];
                        var name = entities.decode(item.name);
                        var downloads = item.download_count;
                        var icon = item.icon;
                        var author = entities.decode(item.publisher);
                        var desc = entities.decode(item.description);
                        var link = 'http://app.meizu.com/apps/public/detail?package_name='+item.package_name;
                        var data = genDataObj(
                            appName, 
                            name, 
                            downloads,
                            icon,
                            author,
                            desc,
                            link
                        );
                        if(data){ objRes.result.push(data); }
                    }
                    parentRes.send(objRes);
                    console.log('--meizu success--');
                } 
                catch(error){ console.log(error); respError(parentRes, objRes); }           
            }
        }
    );
}

exports.anzhi = function(appName, parentRes){
    request.get({
            url:'http://www.anzhi.com/search.php?keyword='+encodeURI(appName),
        }, 
        function (error, response, body) {
            console.log('<<< anzhi >>>');
            var objRes = {
                error: false,
                store: 'anzhi',
                result: [],
            }
            if(error){ respError(parentRes, objRes); } 
            else {
                try{
                    var $ = cheerio.load(body);
                    var items = $('.app_list>ul>li');
                    for(var i = 0; i < items.length; i++){
                        var $item = $(items[i]);
                        var name = $item.find('.app_name').eq(0).text();
                        var downloads = $item.find('.app_downnum').eq(0).text();
                        var icon = 'http://www.anzhi.com'+$item.find('.app_icon img').prop('src');
                        var desc = $item.find('.app_info > p').text();
                        var link = 'http://www.anzhi.com'+$item.find('.app_name a').prop('href');
                        var data = genDataObj(
                            appName, 
                            name, 
                            downloads,
                            icon,
                            false,
                            desc,
                            link
                        );
                        if(data){ objRes.result.push(data); }
                    }
                    parentRes.send(objRes);
                    console.log('--anzhi success--');
                } 
                catch(error){ console.log(error); respError(parentRes, objRes); }           
            }
        }
    );
}

//CURRENTLY BROKEN. GET URL NO LONGER WORKS
exports.oppo = function(appName, parentRes){
    request.get({
            url:'http://store.oppomobile.com/search/do.html?keyword='+encodeURI(appName),
        }, 
        function (error, response, body) {
            console.log('<<< oppo >>>');
            var objRes = {
                error: false,
                store: 'oppo',
                result: [],
            }
            if(error){ respError(parentRes, objRes); } 
            else {
                try{
                    var $ = cheerio.load(body);
                    var items = $('.list_item');
                    for(var i = 0; i < items.length; i++){
                        $item = $(items[i]);
                        var name = $item.find('.li_middle_top > a').text();
                        var downloads = $item.find('.li_middle_top > span').text();


                        var data = genDataObj(
                            appName, 
                            name, 
                            downloads,
                            icon,
                            false,
                            desc,
                            link
                        );
                        if(data){ objRes.result.push(data); }
                    }
                    parentRes.send(objRes);
                    console.log('--oppo success--');
                } 
                catch(error){ console.log(error); respError(parentRes, objRes); }           
            }          
        }
    );
}





/*
------UNUSED CODE BELOW------
*/


//approx dl count
//***NOT USED. REDIRECTED TO BAIDU NOW
exports.hiapk = function(appName, parentRes){
    var result = [];
    request.get({
            url:'http://apk.hiapk.com/search?key='+appName+'&pid=0',
            followRedirect: false,
        }, 
        function (error, response, body){
            console.log('<<<< hiapk >>>>');
            var objRes = {
                error: false,
                store: 'hiapk',
                result: [],
            }
            if(error){ respError(parentRes, objRes); } 
            else {
                try{
                    var $ = cheerio.load(body);
                    var items = $('.list_item');
                    for(var i = 0; i < items.length; i++){
                        var name = $(items[i]).find('.list_title').text();
                        var downloads = $(items[i]).find('.s_dnum').text();
                        var data = genDataObj(
                            appName, 
                            name, 
                            downloads
                        );
                        if(data){ objRes.result.push(data); }
                    }
                    console.log('--hiapk success--');
                    parentRes.send(objRes);
                } 
                catch(error){ console.log(error); respError(parentRes, objRes); }           
            }            
        }
    );
}


//no dl count
//NO LONGER USED. REDIRECTED TO BAIDU
exports[91] = function(appName, parentRes){
    var result = [];
    request.get({
            url:'http://apk.91.com/soft/android/search/1_5_0_0_'+appName,
            followRedirect: false,
        }, 
        function (error, response, body) {
            console.log('<<< 91 >>>');
            var $ = cheerio.load(body);
            var items = $('.search-list>li');
            for(var i = 0; i < items.length; i++){
                var name = $(items[i]).find('h4').text();
                var downloads = 0;
                var data = genDataObj(appName, name, downloads);
                if(data){ result.push(data); }
            }
            parentRes.send({
                store: '91',
                result: result
            });
        }
    );
}