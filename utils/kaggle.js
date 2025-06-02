
import { KaggleNode } from 'kaggle-node';

const kaggle = new KaggleNode({
  credentials: {
    username: `${process.env.KAGGLE_USERNAME}`,
    key: `${process.env.KAGGLE_KEY}`,
  },
});


export async function searchDatasets(keyword) {
  try {
    const options = {
      search: keyword,
      sortBy: 'votes', 
    };
    const datasets = await kaggle.datasets.search(options);
    return datasets.data; 
  } catch (error) {
    console.error('Error searching datasets:', error);
    throw new Error('Error searching datasets');
  }
}


export async function displayDatasetOptions(keyword) {
  try {
    let datasets = await searchDatasets(keyword);

    if (datasets && datasets.length > 0) {
      console.log(`Found ${datasets.length} datasets for "${keyword}":`);

      datasets = datasets.slice(0, 5);
      datasets.forEach((dataset, index) => {
        console.log(`${index + 1}. ${dataset.title} by ${dataset.ref} - url ${dataset.url}`);
      });

      return {
        status: 200,
        data: datasets,
        message: 'Datasets recommended successfully'
      };
    } else {
      console.log(`No datasets found for "${keyword}".`);
      return {
        status: 404,
        data: [],
        message: `No datasets found for "${keyword}"`
      };
    }
  } catch (error) {
    console.error('Error displaying dataset options:', error);
    return {
      status: 500,
      data: null,
      message: 'Failed to recommend dataset'
    };
  }
}

export async function downloadDataset(datasetRef, downloadPath) {
  try {
    await kaggle.datasets.download(datasetRef, downloadPath);
    console.log(`Dataset ${datasetRef} downloaded to ${downloadPath}`);
  } catch (error) {
    console.error('Error downloading dataset:', error);
    throw new Error('Error downloading dataset');
  }
}
