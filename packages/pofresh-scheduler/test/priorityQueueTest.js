const PriorityQueue = require('../lib/priorityQueue');
//const Queue = require('./PriorityQueue');
//
//const queue = new Queue();

function testPriorityQueue(num, count) {
    let queue = PriorityQueue.createPriorityQueue();

    for (let k = 0; k < num; k++) {
        let testCase = [];
        let result = new Array(count);

        for (let i = 0; i < count; i++) {
            testCase[i] = Math.random() * count;
        }

        let start = (new Date()).getTime();
        for (let i = 0; i < count; i++)
            queue.offer(testCase[i]);
        let end = (new Date()).getTime();
        console.log(end - start);

        start = (new Date()).getTime();
//    let value = queue.pop();
        for (let i = 0; i < count; i++) {
            result[i] = queue.pop();
//      next = result[i];
//      if(value > next){
//        console.log('PriorityQueue error!');
//        console.log(queue);
//        console.log(result);
//        break;
//      }
//      value = next;
//      queue.pop();
        }
        end = (new Date()).getTime();

        console.log(end - start);

//    console.log(result);

        start = result[0];

        for (let i = 1; i < count; i++) {
            let next = result[i];

            if (start > next) {
                console.log("Error!!!!!!");
                console.log("start : " + start + " next : " + next + " i : " + i);
                break;
            }

            start = next;
        }

        console.log('After the ' + k + ' iteration with test count : ' + count);
    }
}

testPriorityQueue(10, 100000);
//let test = [];
//start = Date.now();
//let k;
//for(let i = 0; i < 100000000; i++){
//  k = i + 34354/i ;
//}
//end = Date.now();
//
//console.log(end - start);
