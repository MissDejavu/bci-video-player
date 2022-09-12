import * as tf from '@tensorflow/tfjs-node';
import { add } from '@tensorflow/tfjs-core';


let channels = ["O1", "O2", "P7", "P8", "F3", "F4"];

var model;


function preprocessSSVEP(file = "../sessions/ssvep2019.01.01_12.31.58.json") {
    let data = JSON.parse(fs.readFileSync(file));

}

function createConvModel() {
    model = tf.sequential();

    model.add(tf.layers.conv2d({
        inputShape: [6, 256, 1],
        kernelSize: 3,
        filter: 8,
        strides: 1,
        activation: 'relu',
        kernelInitializer: 'VarianceScaling'
    }));

    model.add(tf.layers.maxPooling2d({
        poolSize: [1, 2],
        strides: [1, 2]
    }));

    model.add(tf.layers.conv2d({
        kernelSize: 3,
        filter: 16,
        strides: 1,
        activation: 'relu',
        kernelInitializer: 'VarianceScaling'
    }));

    model.add(tf.layers.maxPooling2d({
        poolSize: [1, 2],
        strides: [1, 2]
    }));

    model.add(tf.layers.flatten());

    model.add(tf.layers.dense({
        units: 6,
        kernelInitializer: 'VarianceScaling',
        activation: 'softmax'
    }));

    return model;
}

function trainModel(model) {
    model.compile({
        optimizer: tf.train.sgd(0.15),
        loss: 'categoricalCrossentropy'
    });

}