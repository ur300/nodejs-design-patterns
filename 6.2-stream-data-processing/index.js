
const { createReadStream } = require('node:fs');
const { Transform, pipeline, PassThrough } = require('node:stream');
const { parse } = require("csv-parse");

const FILE_PATH = "./payment_fraud.csv";

const fraudByCategory = {};
const fraudByPaymentMethod = {};

const inputStream = createReadStream(FILE_PATH);

// Create the CSV parser stream with relaxed settings to handle potential data issues
const csvParser = parse({ 
  delimiter: ",", 
  from_line: 2,
  relax_column_count: true,  // Allow flexible column counts
  skip_empty_lines: true      // Skip empty lines
});

const fraudByCategoryAggregation = new Transform({
  objectMode: true,
  transform(chunk, encoding, callback) {
    const category = chunk[5] || 'other';
    fraudByCategory[category] = (fraudByCategory[category] || 0) + 1;
    callback(null, chunk);
  }
});

const fraudByPaymentMethodAggregation = new Transform({
  objectMode: true,
  transform(chunk, encoding, callback) {
    const paymentMethod = chunk[3] || 'other';
    fraudByPaymentMethod[paymentMethod] = (fraudByPaymentMethod[paymentMethod] || 0) + 1;
    callback(null, chunk);
  }
});

const logResults = new Transform({
  objectMode: true,
  transform(chunk, encoding, callback) {
    callback();
  },
  flush(callback) {
    console.log("====fraudByCategory=====", fraudByCategory);
    console.log("\n=== FRAUD AGGREGATION BY CATEGORY ===");
    console.log("Category\t\tCount");
    console.log("--------\t\t-----");
    
    // Sort categories by count (descending) and log results
    Object.entries(fraudByCategory)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`${category}\t\t${count}`);
      });
    
    console.log(`\nTotal categories: ${Object.keys(fraudByCategory).length}`);
    console.log(`Total fraud cases: ${Object.values(fraudByCategory).reduce((sum, count) => sum + count, 0)}`);
    
    console.log("\n====fraudByPaymentMethod=====", fraudByPaymentMethod);
    console.log("\n=== FRAUD AGGREGATION BY PAYMENT METHOD ===");
    console.log("Payment Method\t\tCount");
    console.log("--------------\t\t-----");
    
    // Sort payment methods by count (descending) and log results
    Object.entries(fraudByPaymentMethod)
      .sort(([,a], [,b]) => b - a)
      .forEach(([paymentMethod, count]) => {
        console.log(`${paymentMethod}\t\t${count}`);
      });
    
    console.log(`\nTotal payment methods: ${Object.keys(fraudByPaymentMethod).length}`);
    console.log(`Total fraud cases: ${Object.values(fraudByPaymentMethod).reduce((sum, count) => sum + count, 0)}`);
    
    callback();
  }
});

// Create a PassThrough stream to split the data flow for parallel processing
const dataSplitter = new PassThrough({ objectMode: true });

// Process both aggregations in parallel
pipeline(
  inputStream,
  csvParser,
  dataSplitter,
  (err) => {
    if (err) {
      console.error('Pipeline error:', err);
    } else {
      console.log('Pipeline completed successfully');
    }
  }
);

// Split the data flow to process both aggregations in parallel
dataSplitter.pipe(fraudByCategoryAggregation).pipe(logResults).on('finish', () => {
  console.log('Category aggregation completed');
}).on('error', (err) => {
  console.error('Category aggregation error:', err);
});

dataSplitter.pipe(fraudByPaymentMethodAggregation).pipe(logResults).on('finish', () => {
  console.log('Payment method aggregation completed');
}).on('error', (err) => {
  console.error('Payment method aggregation error:', err);
});