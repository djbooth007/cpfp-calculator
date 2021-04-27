//////////////////////////////////////////
//
// Child Pays For Parent Calculator
// BETA v0.2
//
//////////////////////////////////////////

var cpfp=function(){

	
	var tx_list = []; var child_tx_id; var parent_count = 0; var send_to_api = []; var api_is_active = 'N'; var timer;
	
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
		api_is_active = 'N'; send_to_api = []; parent_count = 0; tx_list = []; //reset
		
		child_tx_id = document.getElementById('child_tx_id').value;
				
		if(child_tx_id != ""){
									
			tx_list[child_tx_id] = [];
			
			send_to_api[child_tx_id] = 'N';
			cpfp.call_api('tx/'+child_tx_id);
			
			cpfp.start_timer();

			document.getElementById('backtest_results').innerHTML = ''; // clear previous results

			document.getElementById('recommendations').innerHTML = 'hodl on...';
		}
	}
	
	this.call_api = function(endpoint){
		api_is_active = 'Y';

		var cors_proxy = 'https://cors-proxy.djbooth007.com/';	
		var provider = cors_proxy+'https://mempool.space/api/';
		var xhr_api = new XMLHttpRequest();
		xhr_api.onload = function() { 
			if(this.response !== null){ 
				cpfp.backtest(this.response); 
			}else{ 
				clearInterval(timer);
				document.getElementById('recommendations').innerHTML = '! invalid tx id !'; 
			}
		} 	
		xhr_api.open( 'GET', provider+endpoint );
		xhr_api.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		xhr_api.responseType = 'json';
		xhr_api.send();
	}
	
	this.backtest = function(data){
	
		var txid = data.txid;
		send_to_api[txid] = 'Y';
		
		tx_list[txid] = [];
		tx_list[txid]['confirmed'] = data.status.confirmed;
		tx_list[txid]['vsize'] = data.weight/4;
		tx_list[txid]['fee'] = data.fee;
		
		if(data.status.confirmed === false){ 
			cpfp.display_card(txid,data.weight/4,data.fee);
			for(var j = 0; j < data.vin.length; j++){ send_to_api[data.vin[j]['txid']] = 'N'; }
		}
		
		api_is_active = 'N';
		
		// child tx test
		if(data.status.confirmed === true && txid == child_tx_id){ cpfp.child_confirmed(); }
	}
	
	// timer monitors API calls and results.
	
	this.start_timer = function(){
		timer = setInterval(function(){
			
			if(api_is_active == 'N'){
				
				// are any tx still unchecked
				var unchecked = 0;
				Object.keys(send_to_api).forEach(function(txid){ if(send_to_api[txid] == 'N'){ unchecked++; } });
			
				if(unchecked > 0){
					
					Object.keys(send_to_api).forEach(function(txid){ 
						// N: not checked, Y: is checked
						if(send_to_api[txid] == 'N'){ 
							cpfp.call_api('tx/'+txid);
							return;
						}
					});
					
				}else{ 
					clearInterval(timer); 
					cpfp.check_complete_list();
				}			
			}

		}, 50);		
	}
	
	this.child_confirmed = function(){	
		clearInterval(timer); 	
		cpfp.display_card(child_tx_id,tx_list[child_tx_id]['vsize'],tx_list[child_tx_id]['fee']);	
		document.getElementById('recommendations').innerHTML = 'Child TX is already confirmed.';
	}
	
	this.check_complete_list = function(){
		var finished = 'Y'; 

		for(var j = 0; j < tx_list.length; j++){ 		
			if(tx_list[j]['confirmed'] == 'undefined'){ finished = 'N'; }
		}

		if(finished == 'Y'){ cpfp.calc(); }		
	}
	
	this.calc = function(){
			
		var accumulative_fees = 0; var accumulative_size = 0; var unconfirmed_parent_count = 0;
	
		console.log(child_tx_id,tx_list);
	
		Object.keys(tx_list).forEach(function(key){
			if(tx_list[key]['confirmed'] == false){
				
				if(key != child_tx_id){ unconfirmed_parent_count++; }
				
				accumulative_fees += parseFloat(tx_list[key]['fee']);
				accumulative_size += parseFloat(tx_list[key]['vsize']);
			}			
		});

		var desired_fee = parseFloat(document.getElementById('custom_fee').value);
		var recommendation = cpfp.child_to_pay(desired_fee, accumulative_size, accumulative_fees);
		if(recommendation < 0){ recommendation = 'Desired fee is too low.<br/>Increase to confirm sooner.'; }else{ recommendation = recommendation+' sat/vB'; }
		
		var string = '<div class="card">';
		string += '<span class="memblk"><b>Total Size:</b></span>'+accumulative_size+' vB<br/>';
		string += '<span class="memblk"><b>Fees Paid:</b></span>'+accumulative_fees+' sats<br/>';
		string += '</div>';
		
		string += '<div class="dark_card">';
		
		if(unconfirmed_parent_count > 0){			
			string += '<b>Child to Pay</b><br/>';
			string += recommendation+'<br/>';
		}else{
			string += 'All Parents Already Confirmed<br/>';		
		}
		
		string += '</div>';
		
		document.getElementById('recommendations').innerHTML = string;	
	}
	
	this.child_to_pay = function(desired_fee, accumulative_size, accumulative_fees){
		return Math.ceil( ( ( desired_fee * accumulative_size ) - ( accumulative_fees - tx_list[child_tx_id]['fee'] ) ) / tx_list[child_tx_id]['vsize'] ) + 2;
	}
	
	this.display_card = function(txid,size,fee){
		
		if(!document.getElementById(txid)){
			if(txid != child_tx_id){ parent_count++; var label = '<span class="label" style="background: #044d6a;">Parent '+parent_count+'</span>'; }else{ var label = '<span class="label" style="background: #235b03;">Child</span>'; }
			
			var string = '<div class="card" id="'+txid+'">';
			string += '<span class="memblk">'+label+'<b>TX ID:</b></span><a href="https://mempool.space/tx/'+txid+'" target="_mempoolspace">'+cpfp.trunc(txid)+'</a><br/>';
			string += '<span class="memblk"><b>Size:</b></span>'+size+' vB<br/>';
			string += '<span class="memblk"><b>Paid:</b></span>'+fee+' sats<br/>';
			string += '<span class="memblk"><b>Fee:</b></span>'+Math.round(fee/size)+' sats/vB<br/>';
			string += '</div>';
					
			const div = document.createElement('div');	
			div.innerHTML = string;
			document.getElementById('backtest_results').appendChild(div); 	
		}		
	}

	this.trunc = function(id){
		return id.substring(0,5)+'...'+id.substring(id.length -5,id.length);
	}

}