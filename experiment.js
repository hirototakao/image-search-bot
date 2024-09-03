const array = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

let i = 0;
while(i < array.length) {
  console.log(array[i]);
  i += 1;  
}


'0.680ms for文'
'0.653ms for-of文'
'0.644ms while文'
'0.618ms forEach関数'
'0.549ms map関数'
