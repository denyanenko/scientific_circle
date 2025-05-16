const math = require('mathjs');


function normalizeArray(arr) {
    const sum = arr.reduce((acc, val) => acc + val, 0);
    return arr.map(val => val / sum);
}


function topsis(matrix, w, isMaxCriteria) {
    console.log("TOPSIS");
    
    w = normalizeArray(w);
    console.log("Нормалізовані вагові коефіцієнти критеріїв")
    console.log(w.map(x => x.toFixed(4)));
    

    let sumList = [];
    for (let j = 0; j < w.length; j++) {
        let column = matrix.map(row => row[j]);
        let sum = column.reduce((acc, val) => acc + Math.pow(val, 2), 0);
        sumList.push(Math.sqrt(sum));
    }

    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < w.length; j++) {
            matrix[i][j] = matrix[i][j] / sumList[j];
        }
    }

    console.log("Нормалізовані оцінки");
    matrix.forEach(row => {
        console.log(row.map(x => x.toFixed(4)));
    });

    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < w.length; j++) {
            matrix[i][j] = matrix[i][j] * w[j];
        }
    }

    console.log("Зважені нормалізовані оцінки");
    matrix.forEach(row => {
        console.log(row.map(x => x.toFixed(4)));
    });

    let PIS = [];
    let NIS = [];
    for (let j = 0; j < w.length; j++) {
        let column = matrix.map(row => row[j]);
        if(isMaxCriteria[j]){
            PIS.push(Math.max(...column));
            NIS.push(Math.min(...column));
        }
        else{
            PIS.push(Math.min(...column));
            NIS.push(Math.max(...column));
        }
    }

    console.log("PIS:");
    console.log(PIS.map(x => x.toFixed(4)));
    console.log("NIS:");
    console.log(NIS.map(x => x.toFixed(4)));

    let Dmax = [];
    let Dmin = [];
    for (let row of matrix) {
        let dmax = 0;
        let dmin = 0;
        for (let i = 0; i < w.length; i++) {
            dmax += Math.pow((row[i] - PIS[i]), 2);
            dmin += Math.pow((row[i] - NIS[i]), 2);
        }
        Dmax.push(Math.sqrt(dmax));
        Dmin.push(Math.sqrt(dmin));
    }

    console.log("Відстань альтернатив до PIS");
    console.log(Dmax.map(x => x.toFixed(4)));
    console.log("Відстань альтернатив до NIS");
    console.log(Dmin.map(x => x.toFixed(4)));

    let Cmax = [];
    for (let i = 0; i < matrix.length; i++) {
        Cmax.push(Dmin[i] / (Dmax[i] + Dmin[i]));
    }

    console.log("Ступінь наближення до утопічної точки");
    console.log(Cmax.map(x => x.toFixed(4)));

    let sortedCmax = Cmax.map((value, index) => [index + 1, value])
        .sort((a, b) => b[1] - a[1]);

    console.log("Ранжування на множині альтернатив");
    for (let i = 0; i < Cmax.length; i++) {
        console.log(`Альтернатива ${sortedCmax[i][0]}: ${sortedCmax[i][1].toFixed(4)}`);
    }

    console.log("Найкраща альтернатива - ", sortedCmax[0][0]);
    return sortedCmax;
}

module.exports = { topsis };
