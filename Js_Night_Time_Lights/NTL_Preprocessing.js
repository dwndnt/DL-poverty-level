// Impor dataset untuk pelatihan dan tes
var dataset = ee.ImageCollection("NOAA/VIIRS/001/VNP46A2")
    .filterDate("2022-01-01", "2022-12-31")
    .select("DNB_BRDF_Corrected_NTL");

// Definisikan wilayah penelitian (misalnya, menggunakan batas administratif Sumatera Utara)
var roi = ee.FeatureCollection("users/dinatadewan/shapefile_sumut");

// Fungsi untuk menghitung statistik
var calculateStatistics = function(image) {
  var statistics = image.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: roi,
    scale: 500,
    maxPixels: 1e9
  });
  return image.set(statistics);
};

// Menerapkan fungsi ke setiap citra dalam koleksi
var datasetWithStatistics = dataset.map(calculateStatistics);

// Hitung rata-rata dan deviasi standar dari seluruh citra NTL
var mean_std = datasetWithStatistics.reduceColumns({
  reducer: ee.Reducer.mean().combine({
    reducer2: ee.Reducer.stdDev(),
    sharedInputs: true
  }),
  selectors: ['DNB_BRDF_Corrected_NTL']
});

var mean = mean_std.get('mean');
var stddev = mean_std.get('stdDev');

// Fungsi untuk menghapus cahaya latar belakang dan menormalisasi citra NTL
var normalizeNTL = function(image) {
  var normalized_image = image.subtract(ee.Image.constant(mean)).divide(ee.Image.constant(stddev));
  return normalized_image.set('system:time_start', image.get('system:time_start'));
};

// Ubah citra NTL dengan menghapus cahaya latar belakang dan normalisasi
var normalized_NTL = datasetWithStatistics.map(normalizeNTL);

// Menambahkan layer NTL di wilayah Sumatera Utara ke peta
var vis_params = {
  min: -0.5,  // Sesuaikan dengan ambang batas yang sesuai setelah normalisasi
  max: 4,     // Sesuaikan dengan ambang batas yang sesuai setelah normalisasi
  palette: ['black', 'blue', 'green', 'yellow', 'red', 'white']
};

// Clip layer "Filtered NTL Sumatera Utara" ke wilayah roi
var clipped_NTL = normalized_NTL.map(function(image) {
  return image.clip(roi);
});

Map.centerObject(roi, 7);
Map.addLayer(clipped_NTL, vis_params, "Normalized NTL Sumatera Utara");