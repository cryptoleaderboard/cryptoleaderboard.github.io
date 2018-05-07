/////////////////////////////////////////////////////////////////////////////////////
// 
//   VARIBLES
//
/////////////////////////////////////////////////////////////////////////////////////

"use strict";

const contractAddress = "n1pzLz29aEv68DKAVmPvCztHXXmGoUcVemu";
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

neb.setRequest(new nebulas.HttpRequest(localSave.getItem("apiPrefix") || "https://testnet.nebulas.io"));
refreshDisplay();

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
                showAlert("Refresh display in a minute after the chain has been verified!", "success");
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


/////////////////////////////////////////////////////////////////////////////////////
// 
//   ON LOAD and HANDLERS
//
/////////////////////////////////////////////////////////////////////////////////////

$(function() {
    $(document).on('.data-api');
});

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
        // console.log("refreshDisplay's > full result: ", tx);
        if (tx && tx["result"] != "") {
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
            $("<div>", {"class": "item-amount", "text": item["votedAmount"] + " NAS / " + item["votedAmountNormalizedStr"] + " WEI"}),
        );
        $(".item-containers").append(itemContainer);
    }
    bindVote();
    // $("#current-bid").text(normalizedBidStr);
    // $("#current-data").text(result.current_data);
}

function showPostWallet() {
    $(".post-wallet").show();
    $(".pre-wallet").hide();
}

function showAlert(message, alertType) {
    if (alertType && alertType == "success") {
        $('#alert .modal-title').text("Success!");
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
