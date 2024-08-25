let obj = function(){
	this.app = 1;
}

obj.prototype.add = function(){

}

let a = new obj();

console.log(a);

for(let key in a){
	console.log(key);
}