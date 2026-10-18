const MS=require(require('path').join(__dirname,'..','mathspeech.js'));
const V=(s)=>{const v=MS.value(s);return v?MS.str(v):null};
const cases=[['three fourths','3/4'],['3/4','3/4'],['three quarters','3/4'],['one half','1/2'],['a half','1/2'],['half','1/2'],['point five','1/2'],['0.5','1/2'],['.5','1/2'],
['negative four','-4'],['minus 4','-4'],['-4','-4'],['x equals 4','4'],['X = 4','4'],['next equals four','4'],['two and a half','5/2'],['2 1/2','5/2'],['2 and 1/2','5/2'],
['twenty five','25'],['one hundred twenty','120'],['a hundred','100'],['$1.50','3/2'],['12 dollars','12'],['twelve','12'],['two point five','5/2'],['five eighths','5/8'],
['three over four','3/4'],['3 out of 4','3/4'],['25 percent','25'],['25%','25'],['two thirds','2/3'],['three-fourths','3/4'],['1 and 3/4','7/4'],['nine fourths','9/4'],
['negative one half','-1/2'],['it is 15','15'],['the answer is 7','7'],['x is 6','6'],['50 cents','1/2'],['two dollars and 50 cents','5/2'],['seventy two','72'],['zero point two five','1/4'],
['1/3','1/3'],['four','4'],['eight','8'],['three and three fourths','15/4'],['negative 2.5','-5/2'],['one fourth','1/4'],['a quarter','1/4'],['thirty','30'],['1,200','1200']];
let bad=0; for(const [s,w] of cases){const g=V(s); if(g!==w){bad++;console.log('VALUE FAIL',JSON.stringify(s),g,'want',w);}}
const ch=['12','15','8 1/2','20'], chf=['3/4','1/2','2/3','1/4'], ch8=['6','8','10','12'];
const L=[['A',ch,0],['a.',ch,0],['hey',ch,0],['eh',ch,0],['ay',ch,0],['uh',ch,0],['yeah',ch,0],['hey hey',ch,0],['8',ch,0],['8',ch8,null],['',ch,null],
['be',ch,1],['bee',ch,1],['B.',ch,1],['see',ch,2],['sea',ch,2],['si',ch,2],['the',ch,3],['dee',ch,3],['D',ch,3],['letter A',ch,0],['answer A',ch,0],['answer b',ch,1],
['first',ch,0],['second',ch,1],['third',ch,2],['fourth',ch,3],['one',ch,0],['two',ch,1],['alpha',ch,0],['bravo',ch,1],['charlie',ch,2],['delta',ch,3],['Letter D.',ch,3],['the answer is c',ch,2]];
for(const [s,c,w] of L){const g=MS.letterIndex(s,c); if(g!==w){bad++;console.log('LETTER FAIL',JSON.stringify(s),g,'want',w);}}
const CV=[['twelve',ch,0],['12',ch,0],['fifteen',ch,1],['eight and a half',ch,2],['twenty',ch,3],['one half',chf,1],['three fourths',chf,0],['eight',ch8,1]];
for(const [s,c,w] of CV){const g=MS.choiceByValue(s,c); if(g!==w){bad++;console.log('CHOICE FAIL',s,g,'want',w);}}
console.log('fails',bad,'of',cases.length+L.length+CV.length); process.exit(bad?1:0);
