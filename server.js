/*SocketIO based chat room. Extended to not echo messages
to the client that sent them.*/
//Alexander Kuhn, ID 101023154

var http = require('http').createServer(handler);
var io = require('socket.io')(http);
var fs = require('fs');
var mime = require('mime-types');
var url = require('url');

const ROOT = "./files";

http.listen(2406);

console.log("Chat server listening on port 2406");


function handler(req, res) {
	
	//process the request
	console.log(req.method+" request for: "+req.url);
	
	//parse the url
	var urlObj = url.parse(req.url,true);
	var filename = ROOT+urlObj.pathname;

		
	//the callback sequence for static serving...
	fs.stat(filename,function(err, stats){
		if(err){   //try and open the file and handle the error, handle the error
			respondErr(err);
		}else{
			if(stats.isDirectory())	filename+="index.html";
		
			fs.readFile(filename,"utf8",function(err, data){
				if(err)respondErr(err);
				else respond(200,data);
			});
		}
	});			
	
	//locally defined helper function
	//serves 404 files 
	function serve404(){
		fs.readFile(ROOT+"/404.html","utf8",function(err,data){ //async
			if(err)respond(500,err.message);
			else respond(404,data);
		});
	}
		
	//locally defined helper function
	//responds in error, and outputs to the console
	function respondErr(err){
		console.log("Handling error: ",err);
		if(err.code==="ENOENT"){
			serve404();
		}else{
			respond(500,err.message);
		}
	}
		
	//locally defined helper function
	//sends off the response message
	function respond(code, data){
		// content header
		res.writeHead(code, {'content-type': mime.lookup(filename)|| 'text/html'});
		// write message and signal communication is complete
		res.end(data);
	}	
	
};//end handle request

clients = [];

io.on("connection", function(socket){
	console.log("Got a connection");
	socket.on("intro",function(data){ //welcomes/announces new users, adds them to client list, sends data to client-side user list
		socket.username = data;
		socket.blockedList = [];
		socket.broadcast.emit("message", timestamp()+": "+socket.username+" has entered the chatroom.");
		socket.emit("message","Welcome, "+socket.username+".");
		clients.push(socket);
		
		io.emit("userList", getUserList());
		blockStyler();
	});
		
	socket.on("message", function(data){ //takes username/message sent by a user and sends it to all the clients (bonus: unless the client has blocked the sender)
		for (i = 0; i < clients.length; i++){
				if ((clients[i].blockedList.indexOf(socket.username)) < 0 && (clients[i].username != socket.username)) {
					data['username'] = socket.username;
					clients[i].emit("message",timestamp()+", "+socket.username+": "+data);
				}
		}
	});
	
	socket.on("privateMessage", function(data){ //sends message privately from one user to another, unless the sender has been blocked by the recipient
		console.log("got message for: "+data['username']);
		for (i = 0; i < clients.length; i++){
			if (clients[i].username == data['username']){
				if (clients[i].blockedList.indexOf(socket.username) < 0) {
					data['username'] = socket.username;
					clients[i].emit("privateMessage",data);
					break;
				}
			}
		}

	});
	
	socket.on("blockUser", function(data){ //takes a username and blocks/unblocks that person depending on whether the client has already blocked them
		if (socket.blockedList.indexOf(data['username']) >= 0){
			delete socket.blockedList[socket.blockedList.indexOf(data['username'])];
			socket.emit("message",data['username'] + " has been unblocked.");
		}
		else {
			socket.blockedList.push(data['username']);
			socket.emit("message",data['username'] + " has been blocked.");
		}
		socket.emit("blockUser", data);
	});

	socket.on("disconnect", function(){ //simply removes the disconnected user from the chatroom
		console.log(socket.username+" disconnected");
		io.emit("message", timestamp()+": "+socket.username+" disconnected.");
		clients = clients.filter(function(ele){  
			return ele!==socket;
		});
		io.emit("userList", getUserList());
		blockStyler();
	});
	
});

function timestamp(){
	return new Date().toLocaleTimeString();
}

function getUserList(){ //takes the names from clients and passes them to a calling function so all the userlists get updated
    var ret = [];
    for(var i=0;i<clients.length;i++){
        ret.push(clients[i].username + "<br>");
    }
	console.log("User list dispatched.");
    return ret;
}

function blockStyler(){ //after the user list is reset, this reminds the client to put a line through the names of blocked users
	for (i = 0; i < clients.length; i++){
		for (j = 0; j < clients.length; j++){
			if (clients[i].blockedList.indexOf(clients[j].username) >= 0) {		
				data = {'username':clients[j].username};
				clients[i].emit("blockUser", data);
			}
		}
	}
}