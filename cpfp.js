//////////////////////////////////////////
//
// Child Pays For Parent Calculator
// BETA v0.1
//
//////////////////////////////////////////

var cpfp=function(){

	
	var tx_list = []; var child_tx_id;
	
	// check for keyboard input
	
	document.getElementById('child_tx_id').addEventListener("keyup", function(event) {
		// Number 13 is the "Enter" key on the keyboard
		if(event.keyCode === 13) {
			event.preventDefault();
			document.getElementById("custom_fee").focus();
		}
	});
	
	document.getElementById('custom_fee').addEventListener("keyup", function(event) {
		// Number 13 is the "Enter" key on the keyboard
		if(event.keyCode === 13) {
			event.preventDefault();
			cpfp.start();
		}
	});
	
	this.start = function(){
			
		// begin recursive backtest from child transaction
		child_tx_id = document.getElementById('child_tx_id').value;
		
		if(child_tx_id != ""){
			tx_list[child_tx_id] = [];
			
			cpfp.call_api('tx/'+child_tx_id);

			document.getElementById('recommendations').innerHTML = 'hodl on...';
		}
	}
	
	this.call_api = function(endpoint){
		
		var cors_proxy = 'https://cors-anywhere.herokuapp.com/';	
		var provider = cors_proxy+'https://mempool.space/api/';
		var xhr_api = new XMLHttpRequest();
		xhr_api.onload = function() { 
			if(this.response !== null){ cpfp.backtest(this.response); }
		} 	
		xhr_api.open( 'GET', provider+endpoint );
		xhr_api.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		xhr_api.responseType = 'json';
		xhr_api.send();
	}
	
	this.backtest = function(data){
		
		tx_list[data.txid]['confirmed'] = data.status.confirmed;
		
		var vsize = data.weight/4;
		
		tx_list[data.txid]['vsize'] = vsize;
		tx_list[data.txid]['fee'] = data.fee;
		
		if(data.status.confirmed === false){ 
			cpfp.display_card(data.txid,vsize,data.fee); 
		}
	
		if(data.status.confirmed === false){
			var list = [];			
			for(var j = 0; j < data.vin.length; j++){ 
				list.push(data.vin[j]['txid']);
				tx_list[data.vin[j]['txid']] = [];				
			}
			
			// continue backtesting
			cpfp.backtest_list(list);			
		}
		
		// have we checked everything
		if(data.status.confirmed === true){
		
			if(child_tx_id == data.txid){
				cpfp.child_confirmed();
			}else{ 
				cpfp.check_complete_list();				
			}
		}
		
	}
	
	this.child_confirmed = function(){		
		cpfp.display_card(child_tx_id,tx_list[child_tx_id]['vsize'],tx_list[child_tx_id]['fee']);	
		document.getElementById('recommendations').innerHTML = 'Child TX is already confirmed.';
	}
	
	this.backtest_list = function(list){

		var j = 0;
		Object.keys(list).forEach(function(key){
			setTimeout(function(){ 	cpfp.call_api('tx/'+list[key]); }, 500*j); // prevent bombarding API
			j++;			
		});			
	}
	
	this.check_complete_list = function(){
		var finished = 'Y'; 
		
		for(var j = 0; j < tx_list.length; j++){ 		
			if(tx_list[j]['confirmed'] == 'undefined'){ finished = 'N'; }
		}

		if(finished == 'Y'){ cpfp.calc(); }		
	}
	
	this.calc = function(){
			
		var accumulative_fees = 0; var accumulative_size = 0;
		
		Object.keys(tx_list).forEach(function(key){
			if(tx_list[key]['confirmed'] == false){
				accumulative_fees += parseFloat(tx_list[key]['fee']);
				accumulative_size += parseFloat(tx_list[key]['vsize']);
			}			
		});
		
		var desired_fee = parseFloat(document.getElementById('custom_fee').value);
		var recommendation = cpfp.child_to_pay(desired_fee, accumulative_size, accumulative_fees);
		
		var string = '<div class="card">';
		string += '<span class="memblk"><b>Total Size:</b></span>'+accumulative_size+' vB<br/>';
		string += '<span class="memblk"><b>Fees Paid:</b></span>'+accumulative_fees+' sats<br/>';
		string += '</div>';
		
		string += '<div class="dark_card">';
		string += '<b>Child to Pay</b><br/>';
		string += recommendation+' sats<br/>';
		string += '</div>';
		
		document.getElementById('recommendations').innerHTML = string;	
	}
	
	this.child_to_pay = function(desired_fee, accumulative_size, accumulative_fees){
		return Math.ceil( ( ( desired_fee * accumulative_size ) - ( accumulative_fees - tx_list[child_tx_id]['fee'] ) ) / tx_list[child_tx_id]['vsize'] ) + 2;
	}
	
	this.display_card = function(txid,size,fee){
		
		var string = '<div class="card">';
		string += '<span class="memblk"><b>TX ID:</b></span> <a href="https://mempool.space/tx/'+txid+'" target="_mempoolspace">'+cpfp.trunc(txid)+'</a><br/>';
		string += '<span class="memblk"><b>Size:</b></span>'+size+' vB<br/>';
		string += '<span class="memblk"><b>Fee:</b></span>'+fee+' sats<br/>';
		string += '</div>';
				
		const div = document.createElement('div');	
		div.innerHTML = string;
		document.getElementById('backtest_results').appendChild(div); 		
	}

	this.trunc = function(id){
		return id.substring(0,5)+'...'+id.substring(id.length -5,id.length);
	}

}