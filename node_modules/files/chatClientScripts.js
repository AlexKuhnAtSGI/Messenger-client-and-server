//Alexander Kuhn (ID 101023154)
$(document).ready(function(){
		
			var clientName = prompt("What's your name?")||"User";
			
			var socket = io(); //connect to the server that sent this page
			socket.on('connect', function(){
				socket.emit("intro", clientName);
			});
			
			
			$('#inputText').keypress(function(ev){
					if(ev.which===13){
						//send message
						socket.emit("message",$(this).val());
						ev.preventDefault(); //if any
						$("#chatLog").append(timestamp()+", "+clientName+": "+$(this).val()+"\n")
						$(this).val(""); //empty the input
					}
			});
			
			socket.on("message",function(data){
				$("#chatLog").append(data+"\n");
				$('#chatLog')[0].scrollTop=$('#chatLog')[0].scrollHeight; //scroll to the bottom
			});
			
			socket.on("userList",function(data){ //updates list of users upon change (connect/disconnect)
				$("#userList").empty();
				for (var key in data){
					$("#userList").append("<li class='userName' id='" + data[key].replace("<br>", "") + "'>" + data[key] + "</li>");
				}
				
				$(".userName").dblclick(function(e){ //double click handler
					username = $(this).html().replace('<br>','')
					if (!e.shiftKey){ //if shift key is not being held on double click, sends private message
						if (username != clientName){
							message = prompt("Enter your private message.");
							if ((message != "") && (message != null)) {
								messageData = {'username':username, 'message':message}
								socket.emit("privateMessage",messageData);
							}
						}
					}
					else { //otherwise, blocks/unblocks
						if (username != clientName){
							blockData = {'username':username};
							socket.emit("blockUser", blockData);
						}
					}
				});
			});
			
			socket.on("privateMessage",function(data){ //on receipt of private message, prompts user for response
				message = prompt(data['username']+ " says: " + data['message']);
				if ((message != "") && (message != null)) {
					messageData = {'username':data['username'], 'message':message};
					socket.emit("privateMessage",messageData);
				}
			});
			
			socket.on("blockUser", function(data){ //bonus: puts a line through the names of blocked users
				$("#"+data['username']).toggleClass("blocked");
			});
			
			
});

function timestamp(){
	return new Date().toLocaleTimeString();
}