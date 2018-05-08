/////////////////////////////////////////////////////////////////////////////////////
// 
//   VARIBLES
//
/////////////////////////////////////////////////////////////////////////////////////

"use strict";

const testContractAddress = "n1iBtCibUNxNqsqsgRLk1X2NU3CGYti6ex1";
const mainContractAddress = "n1kGNSmXQBLFLffXtbrxuKRCaDZXWzA97Ap";
var contractAddress = mainContractAddress;

var nebulas = require("nebulas"),
    Account = nebulas.Account,
    Utils = nebulas.Utils,
    neb = new nebulas.Neb(),
    globalParams = {
        account: null
    };

/////////////////////////////////////////////////////////////////////////////////////
// 
//   INIT NEBULA
//
/////////////////////////////////////////////////////////////////////////////////////

// var net = "https://testnet.nebulas.io";
// setNet(net); // sets the apiPrefix and other chain specific parameters into "localSave"

// neb.setRequest(new nebulas.HttpRequest(localSave.getItem("apiPrefix")));
// refreshDisplay();

switchToMainnet();

uiBlock.insert({
    footer: ".footer",
    header: ".header",
    iconAddress: ".icon-address",
    logoMain: ".logo-main",
    numberComma: ".number-comma",
    selectWalletFile: [".select-wallet-file", onUnlockFile]
});

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
//
// onClickCallTest to test contract call
//
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function onClickCallTest(alsoExecute) {
    innerCall(function (params) {
        neb.api
            .call({
                from: params.from,
                to: params.to,
                value: params.value,
                nonce: params.nonce,
                gasPrice: params.gasPrice,
                gasLimit: params.gasLimit,
                contract: params.contract
            })
            .then(function (resp) {
                $("#call_test_result").text(JSON.stringify(resp));
                // console.log("alsoExecute",alsoExecute);
                if (alsoExecute) {
                    onClickCall();
                }
                // onClickCall();
                // newGameId = resp["result"];
                if (resp.execute_err && resp.execute_err !== "") {
                    $("#call").attr("disabled", true);
                    $("#call_result").text("");
                    $(".next").removeClass("active1");
                } else {
                    $("#call").attr("disabled", false);
                    $("#call_result").text("");
                    $(".next").removeClass("active1");
                }
            })
            .catch(function (err) {
                console.log(err);
                $("#call_test_result").text(JSON.stringify(err));
                $("#call").attr("disabled", true);
                $("#call_result").text("");
                $(".next").removeClass("active1");
            });
    });
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
//
// onClickCall to submit contract call
//
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function onSubmitThrow() {
    onClickCallTest(true);
}

function onClickCall() {
    $(".modal.loading").modal("show");

    innerCall(function (params) {
        var gTx = new nebulas.Transaction(parseInt(localSave.getItem("chainId")),
            globalParams.account,
            params.to, params.value, params.nonce, params.gasPrice, params.gasLimit, params.contract);

        gTx.signTransaction();

        neb.api
            .sendRawTransaction(gTx.toProtoString())
            .then(function (resp) {
                console.log(JSON.stringify(resp));
                // showAlert(JSON.stringify(resp));
                $("#call_result").text(JSON.stringify(resp));
                $("#wallet-modal").modal("hide");
                $("#wallet-modal").removeClass("listen-to-bs-shown");
                $("#wallet-modal").removeClass("marked-for-close");
                
                showAlert("等候刷新！Refresh display in a minute after the chain has been verified!", "success");
                refreshDisplay();
                // $(".result").removeClass("active1");
                // $(".next").removeClass("active1");
                // $("#receipt_call").text(resp.txhash).prop("href", "check.html?" + resp.txhash);
                $(".modal.loading").modal("hide");
            })
            .catch(function (err) {
                console.log(JSON.stringify(err));
                // showAlert(JSON.stringify(err));
                $("#call_result").text(JSON.stringify(err));
                // $(".result").removeClass("active1");
                // $(".next").removeClass("active1");
                // $(".modal.loading").modal("hide");
            });
    });
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
//
// onUnlockFile
//
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function onUnlockFile(swf, fileJson, account, password) {
    var balance_nas, state,
        fromAddr = account.getAddressString(),
        $tab = $(swf).closest(".tab");

    $(".modal.loading").modal("show");

    $("#run_from_addr").val(fromAddr).trigger("input");

    try {
        account.fromKey(fileJson, password);
        globalParams.account = account;
        $("#unlock").hide();
        $("#send").show();

        neb.api.gasPrice()
            .then(function (resp) {
                console.log("api gasprice");
                $("#gas_price").val(resp.gas_price);
                $("#run_gas_price").val(resp.gas_price);
                console.log(resp);
                return neb.api.getAccountState(fromAddr);
            })
            .then(function (resp) {
                console.log("api gasprice 2");
                console.log(resp);
                var balance = nebulas.Unit.fromBasic(resp.balance, "nas");

                $("#run_balance").val(balance + " NAS");
                $(".modal.loading").modal("hide");
                showPostWallet();
            })
            .catch(function (e) {
                // this catches e thrown by nebulas.js!neb

                bootbox.dialog({
                    backdrop: true,
                    onEscape: true,
                    message: i18n.apiErrorToText(e.message),
                    size: "large",
                    title: "Error"
                });

                $(".modal.loading").modal("hide");
            });
    } catch (e) {
        // this catches e thrown by nebulas.js!account
        console.log(e);

        bootbox.dialog({
            backdrop: true,
            onEscape: true,
            message: localSave.getItem("lang") == "en" ? e : "keystore 文件错误, 或者密码错误",
            size: "large",
            title: "Error"
        });

        $(".modal.loading").modal("hide");
    }
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
//
// innerCall
//
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function innerCall(callback) {
    let params = {};

    ////////////////////////////////////////////////////////////////////////////////
    // prepare from address
    
    if (!globalParams.account) {
        // TODO 提示钱包信息不正确
        return;
    }
    params.from = globalParams.account.getAddressString();


    ////////////////////////////////////////////////////////////////////////////////
    // prepare to address

    // let toAddr = $("#run_to_addr").val().trim();
    // if (!Account.isValidAddress(toAddr)) {
    //     $("#run_to_addr").addClass("err");
    //     setTimeout(function () {
    //         $("#run_to_addr").removeClass("err");
    //     }, 5000);
    //     return;
    // }
    // params.to = toAddr;

    if (!Account.isValidAddress(contractAddress)) {
        $("#run_to_addr").addClass("err");
        setTimeout(function () {
            $("#run_to_addr").removeClass("err");
        }, 5000);
        showAlert("Invalid contract address");
        return;
    }
    params.to = contractAddress;


    ////////////////////////////////////////////////////////////////////////////////
    // prepare gasLimit

    let gasLimit = Utils.toBigNumber(0);
    try {
        gasLimit = Utils.toBigNumber($("#run_gas_limit").val());
    } catch (err) {
        console.log(err);
        showAlert(err);
    }
    if (gasLimit.cmp(Utils.toBigNumber(0)) <= 0) {
        $("#run_gas_limit").addClass("err");
        setTimeout(function () {
            $("#run_gas_limit").removeClass("err");
        }, 5000);
        showAlert("gasLimit error");
        return;
    }
    params.gasLimit = gasLimit.toNumber();


    ////////////////////////////////////////////////////////////////////////////////
    // prepare gasPrice

    let gasPrice = Utils.toBigNumber(0);
    try {
        gasPrice = Utils.toBigNumber($("#run_gas_price").val());
    } catch (err) {
        console.log(err);
        showAlert(err);
    }
    if (gasPrice.cmp(Utils.toBigNumber(0)) <= 0) {
        $("#run_gas_price").addClass("err");
        setTimeout(function () {
            $("#run_gas_price").removeClass("err");
        }, 5000);
        showAlert("gasPrice error");
        return;
    }
    params.gasPrice = gasPrice.toNumber();

    ////////////////////////////////////////////////////////////////////////////////
    // prepare value

    var amountEntered = $("#run_value").val();

    let value = Utils.toBigNumber(0);
    try {
        value = nebulas.Unit.toBasic(Utils.toBigNumber(amountEntered), "nas");
    } catch (err) {
        console.log(err);
        showAlert(err);
    }
    if (value.cmp(Utils.toBigNumber(0)) < 0) {
        // TODO 添加提示value输入不对
        console.log("invalid value");
        showAlert("Invalid amount");
        return;
    }
    params.value = value;

    ////////////////////////////////////////////////////////////////////////////////
    // prepare contract
    
    var bidDisplay = $('#bid-display').val();
    var functionToCall = "vote";
    var argsToCall = JSON.stringify([bidDisplay]);
    console.log(bidDisplay, functionToCall, argsToCall);
    params.contract = {
        "function": functionToCall,
        "args": argsToCall
    };

    // Additional params to pass down

    ////////////////////////////////////////////////////////////////////////////////
    // prepare nonce
    // needs refresh data on every 'test' and 'commit' call, because data update may slow,
    // you can get different result by hit 'test' multiple times
    neb.api.getAccountState(params.from).then(function (resp) {
        var balance = nebulas.Unit.fromBasic(resp.balance, "nas"),
            $tab = $(".show.tab");

        params.nonce = parseInt(resp.nonce) + 1;

        $("#run_balance").val(balance + " NAS");
        // if ($tab.prop("id") == "tab2")
        //     $("#balance").val(balance + " NAS");
        // else if ($tab.prop("id") == "tab3")
        //     $("#run_balance").val(balance + " NAS");

        callback(params);
    }).catch(function (err) {
        console.log("prepare nonce error: " + err);
        // bootbox.dialog({
        //     backdrop: true,
        //     onEscape: true,
        //     message: i18n.apiErrorToText(err.message),
        //     size: "large",
        //     title: "Error"
        // });
    });
}

function setNet(net) {
    var i, len, apiList, langList,
        apiPrefix, sApiButtons, sApiText,
        lang, sLangButtons;

    localSave.setItem("apiPrefix", net)

    apiList = [
        { chainId: 1, name: "Mainnet", url: "https://mainnet.nebulas.io" },
        { chainId: 1001, name: "Testnet", url: "https://testnet.nebulas.io" },
        { chainId: 100, name: "Local Nodes", url: "http://127.0.0.1:8685"}
    ];
    apiPrefix = (localSave.getItem("apiPrefix") || "").toLowerCase();
    sApiButtons = "";

    for (i = 0, len = apiList.length; i < len && apiList[i].url != apiPrefix; ++i);

    i == len && (i = 0);
    localSave.setItem("apiPrefix", apiPrefix = apiList[i].url);
    localSave.setItem("chainId", apiList[i].chainId);
    sApiText = apiList[i].name;

    for (i = 0, len = apiList.length; i < len; ++i)
        sApiButtons += '<button class="' +
            (apiPrefix == apiList[i].url ? "active " : "") + 'dropdown-item" data-i=' + i + ">" +
            apiList[i].name + "</button>";
    //
    // lang

    langList = i18n.supports();
    lang = (localSave.getItem("lang") || "").toLowerCase();
    sLangButtons = "";

    for (i = 0, len = langList.length; i < len && langList[i] != lang; ++i);

    i == len && (i = 0);
    localSave.setItem("lang", lang = langList[i]);
}

/////////////////////////////////////////////////////////////////////////////////////
// 
//   ON LOAD and HANDLERS
//
/////////////////////////////////////////////////////////////////////////////////////

$(function() {
    $(document).on('.data-api');
    
    // Social Media
    var buttons = document.querySelectorAll(".social_share");
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener('click', function() {
            return JSShare.go(this);
        }, false);
    }     
});

$(".switch-test").on("click", switchToTestnet);
$(".switch-main").on("click", switchToMainnet);
$("#call_test").on("click", onClickCallTest);
$("#call").on("click", onClickCall);

$("#submitCall").on("click", function() {
    onSubmitThrow();
});

/////////////////////////////////////////////////////////////////////////////////////
// 
//   Refresh Display
//
/////////////////////////////////////////////////////////////////////////////////////

function refreshDisplay() {
    var callParamsObj = {
        chainID: parseInt(localSave.getItem("chainId")),
        // chainID: 1001,
        from: "n1EdY7FnXvYqSG9zT68rnbBRfCXiXAVDfss",
        to: contractAddress,
        value: 0,
        // nonce: parseInt(state["nonce"])+1,
        gasPrice: 1000000,
        gasLimit: 200000,
        contract: {
            function: "list_counters",
            args: "[]",
        }
    };
    console.log("refreshDisplay > callParamsObj", callParamsObj);
    neb.api.call(callParamsObj).then(function(tx) {
        console.log("refreshDisplay's > full result: ", tx);
        if (tx && tx["result"] && tx["result"] != "") {
            var result = JSON.parse(tx["result"]);
            // console.log("refreshDisplay's > result: ", result);
            updateDisplay(result);
        }
    }).catch((err) => {
        console.log(err);
        showAlert(err);
    });          
}

/////////////////////////////////////////////////////////////////////////////////////
// 
//   Functions
//
/////////////////////////////////////////////////////////////////////////////////////

function switchNet(net) {
    setNet(net); // sets the apiPrefix and other chain specific parameters into "localSave"
    neb.setRequest(new nebulas.HttpRequest(localSave.getItem("apiPrefix")));
    refreshDisplay();
}

function switchToTestnet() {
    console.log("Switching to testnet");
    contractAddress = testContractAddress;
    switchNet("https://testnet.nebulas.io");
}

function switchToMainnet() {
    console.log("Switching to mainnet");
    contractAddress = mainContractAddress;
    switchNet("https://mainnet.nebulas.io");
}

function bindVote() {
    $(".item").on("click", function() {
        var itemName = $(this).data("item");
        console.log(itemName);
        $("#bid-display").val(itemName);
        $("#wallet-modal").modal("show");
    });
}

function updateDisplay(result) {
    console.log(result);
    $(".item-containers").html("");
    var resultArr = [];
    for (var votedItem in result) {
        var itemCount = result[votedItem];
        var itemCountBig = Utils.toBigNumber(itemCount);
        var normalizedBid = nebulas.Unit.fromBasic(itemCount, "nas");
        var normalizedBidBig = Utils.toBigNumber(normalizedBid);
        var normalizedBidStr = Utils.toBigNumber(normalizedBid).toString(10);
        resultArr.push({
            "votedItem": votedItem,
            "votedAmount": result[votedItem],
            "votedAmountBig": itemCountBig,
            "votedAmountNormalized": normalizedBid,
            "votedAmountNormalizedBig": normalizedBidBig,
            "votedAmountNormalizedStr": normalizedBidStr,
        });
    }
    resultArr.sort(function (a, b) {
        if (a.votedAmountBig.lt(b.votedAmountBig)) return 1;
        if (b.votedAmountBig.lt(a.votedAmountBig)) return -1;
        return 0;
    });

    for (var i=0; i<resultArr.length; i++) {
        var item = resultArr[i];
        var itemContainer = $("<div>", {"class": "item rank"+i, "data-item": item["votedItem"]}).append(
            $("<div>", {"class": "item-rank", "text": i+1}),
            $("<div>", {"class": "item-name", "text": item["votedItem"]}),
            $("<div>", {"class": "item-amount", "text": item["votedAmount"] + " Wei / " + item["votedAmountNormalizedStr"] + " NAS"}),
        );
        $(".item-containers").append(itemContainer);
    }
    bindVote();
    setTimeout(createSparklesOnPage, 100);
}

function showPostWallet() {
    $(".post-wallet").show();
    $(".pre-wallet").hide();
}

function showAlert(message, alertType) {
    if (alertType && alertType == "success") {
        $('#alert .modal-title').text("成功！Success!");
        $('#alert .alert-content').html(message);
    } else {
        $('#alert .modal-title').text("Error");
        $('#alert .alert-content').html(message);
    }
    $('#alert').modal({"backdroup": true});
}

function shortenAddress(address) {
    if (typeof address === 'string' && address.length > 20) {
        var length = 5;
        return address.substring(0, length) + "..." + address.substring(address.length-length);
    }
    return "...";
}



/////////////////////////////////////////////////////////////////////////////////////
// 
//   MAGIC
//
/////////////////////////////////////////////////////////////////////////////////////



function createSparklesOnPage() {

    // default is varying levels of transparent white sparkles
    $(".sparkley:first").sparkleh();
    
    // rainbow as a color generates random rainbow colros
    // count determines number of sparkles
    // overlap allows sparkles to migrate... watch out for other dom elements though.
    $(".item-containers .item:first-child").sparkleh({
      color: "rainbow",
      count: 200,
      overlap: 10
    });
    
    // here we create fuscia sparkles
    $(".item-containers .item:first-child").sparkleh({
      count: 100,
      color: ["#ff0080","#ff0080","#0000FF"]
    });
    $(".item-containers .item:first-child").sparkleh({
      count: 50,
      color: "#00ff00",
      speed: 0.05
    });
  
}
  
  
  
  
  
  
  
  $.fn.sparkleh = function( options ) {
      
    return this.each( function(k,v) {
      
      var $this = $(v).css("position","relative");
      
      var settings = $.extend({
        width: $this.outerWidth(),
        height: $this.outerHeight(),
        color: "#FFFFFF",
        count: 50,
        overlap: 0,
        speed: 1
      }, options );
      
      var sparkle = new Sparkle($this, settings);
      sparkle.over();
      
    });
    
  }
  
  
  
  
  function Sparkle( $parent, options ) {
    this.options = options;
    this.init( $parent );
    // this.over();
  }
  
  Sparkle.prototype = {
    
    "init" : function( $parent ) {
        console.log("init");
      
      var _this = this;
      
      this.$canvas = 
        $("<canvas>")
          .addClass("sparkle-canvas")
          .css({
            position: "absolute",
            top: "-"+_this.options.overlap+"px",
            left: "-"+_this.options.overlap+"px",
            "pointer-events": "none"
          })
          .appendTo($parent);
      
      this.canvas = this.$canvas[0];
      this.context = this.canvas.getContext("2d");
      
      this.sprite = new Image();
      this.sprites = [0,6,13,20];
      this.sprite.src = this.datauri;
      
      this.canvas.width = this.options.width + ( this.options.overlap * 2);
      this.canvas.height = this.options.height + ( this.options.overlap * 2);
      
      
      this.particles = this.createSparkles( this.canvas.width , this.canvas.height );
      
      this.anim = null;
      this.fade = false;
      
    },
    
    "createSparkles" : function( w , h ) {
      
      var holder = [];
      
      for( var i = 0; i < this.options.count; i++ ) {
        
        var color = this.options.color;
        
        if( this.options.color == "rainbow" ) {
          color = '#'+ ('000000' + Math.floor(Math.random()*16777215).toString(16)).slice(-6);
        } else if( $.type(this.options.color) === "array" ) {
          color = this.options.color[ Math.floor(Math.random()*this.options.color.length) ];
        }
  
        holder[i] = {
          position: {
            x: Math.floor(Math.random()*w),
            y: Math.floor(Math.random()*h)
          },
          style: this.sprites[ Math.floor(Math.random()*4) ],
          delta: {
            x: Math.floor(Math.random() * 1000) - 500,
            y: Math.floor(Math.random() * 1000) - 500
          },
          size: parseFloat((Math.random()*200).toFixed(2)),
          color: color
        };
              
      }
      
      return holder;
      
    },
    
    "draw" : function( time, fade ) {
          
      var ctx = this.context;
      
      ctx.clearRect( 0, 0, this.canvas.width, this.canvas.height );
            
      for( var i = 0; i < this.options.count; i++ ) {
  
        var derpicle = this.particles[i];
        var modulus = Math.floor(Math.random()*7);
        
        if( Math.floor(time) % modulus === 0 ) {
          derpicle.style = this.sprites[ Math.floor(Math.random()*4) ];
        }
        
        ctx.save();
        ctx.globalAlpha = derpicle.opacity;
        ctx.drawImage(this.sprite, derpicle.style, 0, 7, 7, derpicle.position.x, derpicle.position.y, 7, 7);
        
        if( this.options.color ) {  
          
          ctx.globalCompositeOperation = "source-atop";
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = derpicle.color;
          ctx.fillRect(derpicle.position.x, derpicle.position.y, 7, 7);
          
        }
        
        ctx.restore();
  
      }
      
          
    },
    
    "update" : function() {
      
       var _this = this;
      
       this.anim = window.requestAnimationFrame( function(time) {
  
         for( var i = 0; i < _this.options.count; i++ ) {
  
           var u = _this.particles[i];
           
           var randX = ( Math.random() > Math.random()*2 );
           var randY = ( Math.random() > Math.random()*3 );
           
           if( randX ) {
             u.position.x += ((u.delta.x * _this.options.speed) / 1500); 
           }        
           
           if( !randY ) {
             u.position.y -= ((u.delta.y * _this.options.speed) / 800);
           }
  
           if( u.position.x > _this.canvas.width ) {
             u.position.x = -7;
           } else if ( u.position.x < -7 ) {
             u.position.x = _this.canvas.width; 
           }
  
           if( u.position.y > _this.canvas.height ) {
             u.position.y = -7;
             u.position.x = Math.floor(Math.random()*_this.canvas.width);
           } else if ( u.position.y < -7 ) {
             u.position.y = _this.canvas.height; 
             u.position.x = Math.floor(Math.random()*_this.canvas.width);
           }
           
           if( _this.fade ) {
             u.opacity -= 0.02;
           } else {
             u.opacity -= 0.005;
           }
           
           if( u.opacity <= 0 ) {
             u.opacity = ( _this.fade ) ? 0 : 1;
           }
           
         }
         
         _this.draw( time );
         
         if( _this.fade ) {
           _this.fadeCount -= 1;
           if( _this.fadeCount < 0 ) {
             window.cancelAnimationFrame( _this.anim );
           } else {
             _this.update(); 
           }
         } else {
           _this.update();
         }
         
       });
  
    },
    
    "cancel" : function() {
      
        this.fadeCount = 100;
  
    },
    
    "over" : function() {
      
        window.cancelAnimationFrame( this.anim );
        
        for( var i = 0; i < this.options.count; i++ ) {
            this.particles[i].opacity = Math.random();
        }
        
        this.fade = false;
        this.update();
  
    },
    
    "out" : function() {
        this.fade = true;
        this.cancel();
      
    },
    
    
    
    "datauri" : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAAHCAYAAAD5wDa1AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyRpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYxIDY0LjE0MDk0OSwgMjAxMC8xMi8wNy0xMDo1NzowMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNS4xIE1hY2ludG9zaCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDozNDNFMzM5REEyMkUxMUUzOEE3NEI3Q0U1QUIzMTc4NiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDozNDNFMzM5RUEyMkUxMUUzOEE3NEI3Q0U1QUIzMTc4NiI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjM0M0UzMzlCQTIyRTExRTM4QTc0QjdDRTVBQjMxNzg2IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjM0M0UzMzlDQTIyRTExRTM4QTc0QjdDRTVBQjMxNzg2Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+jzOsUQAAANhJREFUeNqsks0KhCAUhW/Sz6pFSc1AD9HL+OBFbdsVOKWLajH9EE7GFBEjOMxcUNHD8dxPBCEE/DKyLGMqraoqcd4j0ChpUmlBEGCFRBzH2dbj5JycJAn90CEpy1J2SK4apVSM4yiKonhePYwxMU2TaJrm8BpykpWmKQ3D8FbX9SOO4/tOhDEG0zRhGAZo2xaiKDLyPGeSyPM8sCxr868+WC/mvu9j13XBtm1ACME8z7AsC/R9r0fGOf+arOu6jUwS7l6tT/B+xo+aDFRo5BykHfav3/gSYAAtIdQ1IT0puAAAAABJRU5ErkJggg=="
  
  }; 
  
  