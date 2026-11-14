export interface UpazilaMap {
  [districtName: string]: string[];
}

export const BANGLADESH_UPAZILAS: UpazilaMap = {
  // Dhaka Division
  Dhaka: [
    'Dhanmondi', 'Gulshan', 'Banani', 'Uttara', 'Mirpur', 'Mohammadpur',
    'Tejgaon', 'Badda', 'Motijheel', 'Khilgaon', 'Old Dhaka (Lalbagh/Kotwali)',
    'Savar', 'Dhamrai', 'Keraniganj', 'Nawabganj', 'Dohar', 'Basundhara R/A'
  ],
  Gazipur: ['Gazipur Sadar', 'Kaliakair', 'Kapasia', 'Sreepur', 'Kaliganj', 'Tongi'],
  Narayanganj: ['Narayanganj Sadar', 'Bandar', 'Sonargaon', 'Rupganj', 'Araihazar'],
  Tangail: ['Tangail Sadar', 'Delduar', 'Ghatail', 'Gopalpur', 'Madhupur', 'Mirzapur', 'Nagarpur', 'Sakhipur', 'Kalihati', 'Basail'],
  Faridpur: ['Faridpur Sadar', 'Boalmari', 'Alfadanga', 'Madhukhali', 'Bhanga', 'Nagarkanda', 'Charbhadrasan', 'Sadarpur', 'Saltha'],
  Manikganj: ['Manikganj Sadar', 'Singair', 'Shibalaya', 'Saturia', 'Harirampur', 'Ghior', 'Daulatpur'],
  Munshiganj: ['Munshiganj Sadar', 'Sreenagar', 'Sirajdikhan', 'Louhajang', 'Tongibari', 'Gazaria'],
  Narsingdi: ['Narsingdi Sadar', 'Belabo', 'Monohardi', 'Palash', 'Raipura', 'Shibpur'],
  Gopalganj: ['Gopalganj Sadar', 'Kashiani', 'Kotalipara', 'Muksudpur', 'Tungipara'],
  Kishoreganj: ['Kishoreganj Sadar', 'Bhairab', 'Bajitpur', 'Hossainpur', 'Itna', 'Karimganj', 'Katiadi', 'Kuliarchar', 'Mithamain', 'Nikli', 'Pakundia', 'Tarail'],
  Madaripur: ['Madaripur Sadar', 'Kalkini', 'Rajoir', 'Shibchar', 'Dasar'],
  Rajbari: ['Rajbari Sadar', 'Baliakandi', 'Goalandaghat', 'Pangsha', 'Kalukhali'],
  Shariatpur: ['Shariatpur Sadar', 'Damudya', 'Naria', 'Janjira', 'Bhedarganj', 'Gosairhat'],

  // Chattogram Division
  Chattogram: [
    'Kotwali', 'Panchlaish', 'Agrabad', 'Halishahar', 'Pahartali', 'Khulshi',
    'Chandgaon', 'Hathazari', 'Sitakunda', 'Mirsharai', 'Patiya', 'Raozan',
    'Rangunia', 'Boalkhali', 'Anwara', 'Banshkhali', 'Lohagara', 'Satkania', 'Sandwip'
  ],
  'Cox\'s Bazar': ['Cox\'s Bazar Sadar', 'Ramu', 'Chakaria', 'Teknaf', 'Ukhia', 'Moheshkhali', 'Pekua', 'Kutubdia'],
  Cumilla: ['Cumilla Adarsha Sadar', 'Cumilla Sadar Dakshin', 'Barura', 'Brahmanpara', 'Burichang', 'Chandina', 'Chauddagram', 'Daudkandi', 'Debidwar', 'Homna', 'Laksam', 'Muradnagar', 'Nangalkot', 'Meghna', 'Titas', 'Monohargonj'],
  Brahmanbaria: ['Brahmanbaria Sadar', 'Ashuganj', 'Nasirnagar', 'Nabinagar', 'Sarail', 'Kasba', 'Akhaura', 'Bancharampur', 'Bijoynagar'],
  Rangamati: ['Rangamati Sadar', 'Kaptai', 'Bagaichhari', 'Barkal', 'Langadu', 'Rajasthali', 'Belaichhari', 'Juraichhari', 'Naniarchar'],
  Bandarban: ['Bandarban Sadar', 'Ruma', 'Thanchi', 'Rowangchhari', 'Lama', 'Ali Kadam', 'Naikhongchhari'],
  Khagrachhari: ['Khagrachhari Sadar', 'Dighinala', 'Panchhari', 'Mahalchhari', 'Matiranga', 'Manikchhari', 'Ramgarh', 'Guimara'],
  Noakhali: ['Noakhali Sadar (Sudharam)', 'Begumganj', 'Chatkhil', 'Companiganj', 'Hatiya', 'Senbagh', 'Subarnachar', 'Kabirhat', 'Sonaimuri'],
  Feni: ['Feni Sadar', 'Chhagalnaiya', 'Daganbhuiyan', 'Parshuram', 'Fulgazi', 'Sonagazi'],
  Chandpur: ['Chandpur Sadar', 'Faridganj', 'Haimchar', 'Haziganj', 'Kachua', 'Matlab Dakshin', 'Matlab Uttar', 'Shahrasti'],
  Lakshmipur: ['Lakshmipur Sadar', 'Raipur', 'Ramganj', 'Ramgati', 'Kamalnagar'],

  // Sylhet Division
  Sylhet: ['Sylhet Sadar', 'Beanibazar', 'Golapganj', 'Companiganj', 'Fenchuganj', 'Bishwanath', 'Gowainghat', 'Jaintiapur', 'Kanaighat', 'Balaganj', 'Dakshin Surma', 'Zakiganj', 'Osmani Nagar'],
  Moulvibazar: ['Moulvibazar Sadar', 'Sreemangal', 'Kamalganj', 'Kulaura', 'Rajnagar', 'Barlekha', 'Juri'],
  Habiganj: ['Habiganj Sadar', 'Bahubal', 'Madhabpur', 'Chunarughat', 'Nabiganj', 'Baniachong', 'Ajmiriganj', 'Lakhai', 'Shayestaganj'],
  Sunamganj: ['Sunamganj Sadar', 'Chhatak', 'Jagannathpur', 'Derai', 'Tahirpur', 'Dharampasha', 'Jamalganj', 'Shantiganj', 'Bishwamvarpur', 'Doarabazar', 'Madhyanagar'],

  // Rajshahi Division
  Rajshahi: ['Boalia', 'Motihar', 'Rajpara', 'Shah Makhdum', 'Paba', 'Godagari', 'Tanore', 'Mohanpur', 'Bagmara', 'Durgapur', 'Puthia', 'Charghat', 'Bagha'],
  Sirajganj: ['Sirajganj Sadar', 'Belkuchi', 'Chauhali', 'Kamarkhanda', 'Kazipur', 'Raiganj', 'Shahjadpur', 'Tarash', 'Ullapara'],
  Pabna: ['Pabna Sadar', 'Atgharia', 'Bera', 'Bhangura', 'Chatmohar', 'Faridpur', 'Ishwardi', 'Santhia', 'Sujanagar'],
  Bogura: ['Bogura Sadar', 'Adamdighi', 'Dhunat', 'Dhupchanchia', 'Gabtali', 'Kahaloo', 'Nandigram', 'Sariakandi', 'Shajahanpur', 'Sherpur', 'Shibganj', 'Sonatala'],
  Naogaon: ['Naogaon Sadar', 'Mohadevpur', 'Patnitala', 'Dhamoirhat', 'Badalgachhi', 'Manda', 'Niamatpur', 'Atrai', 'Raninagar', 'Porsha', 'Sapahar'],
  Natore: ['Natore Sadar', 'Baraigram', 'Gurudaspur', 'Lalpur', 'Singra', 'Bagatipara', 'Naldanga'],
  Chapainawabganj: ['Chapainawabganj Sadar', 'Shibganj', 'Gomastapur', 'Nachole', 'Bholahat'],
  Joypurhat: ['Joypurhat Sadar', 'Akkelpur', 'Kalai', 'Khetlal', 'Panchbibi'],

  // Khulna Division
  Khulna: ['Khulna Sadar', 'Sonadanga', 'Khalishpur', 'Daulatpur', 'Khan Jahan Ali', 'Batiaghata', 'Dacope', 'Dumuria', 'Dighalia', 'Koyra', 'Paikgachha', 'Phultala', 'Rupsha', 'Terokhada'],
  Bagerhat: ['Bagerhat Sadar', 'Mongla', 'Morrelganj', 'Sarankhola', 'Rampal', 'Fakirhat', 'Kachua', 'Mollahat', 'Chitalmari'],
  Jashore: ['Jashore Sadar', 'Abhaynagar', 'Bagherpara', 'Chaugachha', 'Jhikargachha', 'Keshabpur', 'Manirampur', 'Sharsha'],
  Satkhira: ['Satkhira Sadar', 'Assasuni', 'Debhata', 'Kalaroa', 'Kaliganj', 'Shyamnagar', 'Tala'],
  Kushtia: ['Kushtia Sadar', 'Kumarkhali', 'Daulatpur', 'Mirpur', 'Bheramara', 'Khoksa'],
  Jhenaidah: ['Jhenaidah Sadar', 'Harakunda', 'Kaliganj', 'Kotchandpur', 'Maheshpur', 'Shailkupa'],
  Chuadanga: ['Chuadanga Sadar', 'Alamdanga', 'Damurhuda', 'Jibannagar'],
  Meherpur: ['Meherpur Sadar', 'Gangni', 'Mujibnagar'],
  Magura: ['Magura Sadar', 'Mohammadpur', 'Shalikha', 'Sreepur'],
  Narail: ['Narail Sadar', 'Kalia', 'Lohagara'],

  // Barishal Division
  Barishal: ['Barishal Sadar (Kotwali)', 'Bakerganj', 'Babuganj', 'Wazirpur', 'Banaripara', 'Gournadi', 'Agailjhara', 'Mehendiganj', 'Muladi', 'Hizla'],
  Patuakhali: ['Patuakhali Sadar', 'Bauphal', 'Galachipa', 'Dashmina', 'Kalapara (Kuakata)', 'Mirzaganj', 'Dumki', 'Rangabali'],
  Bhola: ['Bhola Sadar', 'Burhanuddin', 'Char Fasson', 'Daulatkhan', 'Lalmohan', 'Manpura', 'Tazumuddin'],
  Pirojpur: ['Pirojpur Sadar', 'Bhandaria', 'Mathbaria', 'Kawkhali', 'Nazirpur', 'Nesarabad (Swarupkati)', 'Indurkani'],
  Jhalokati: ['Jhalokati Sadar', 'Kathalia', 'Nalchity', 'Rajapur'],
  Barguna: ['Barguna Sadar', 'Amtali', 'Bamna', 'Betagi', 'Patharghata', 'Taltali'],

  // Rangpur Division
  Rangpur: ['Rangpur Sadar', 'Badarganj', 'Gangachhara', 'Kaunia', 'Mithapukur', 'Pirgachha', 'Pirganj', 'Taraganj'],
  Dinajpur: ['Dinajpur Sadar', 'Birganj', 'Biral', 'Bochaganj', 'Chirirbandar', 'Fulbari', 'Ghoraghat', 'Hakimpur', 'Kaharole', 'Khansama', 'Nawabganj', 'Parbatipur'],
  Kurigram: ['Kurigram Sadar', 'Nageshwari', 'Bhurungamari', 'Phulbari', 'Rajarhat', 'Ulipur', 'Chilmari', 'Rowmari', 'Char Rajibpur'],
  Gaibandha: ['Gaibandha Sadar', 'Gobindaganj', 'Palashbari', 'Sadullapur', 'Saghata', 'Sundarganj', 'Phulchhari'],
  Nilphamari: ['Nilphamari Sadar', 'Saidpur', 'Jaldhaka', 'Kishoreganj', 'Domar', 'Dimla'],
  Thakurgaon: ['Thakurgaon Sadar', 'Pirganj', 'Baliadangi', 'Haripur', 'Ranisankail'],
  Panchagarh: ['Panchagarh Sadar', 'Debiganj', 'Boda', 'Atwari', 'Tetulia'],
  Lalmonirhat: ['Lalmonirhat Sadar', 'Aditmari', 'Kaliganj', 'Hatibandha', 'Patgram'],

  // Mymensingh Division
  Mymensingh: ['Mymensingh Sadar', 'Muktagachha', 'Trishal', 'Bhaluka', 'Fulbaria', 'Gafargaon', 'Gouripur', 'Haluaghat', 'Ishwarganj', 'Nandail', 'Phulpur', 'Tara Khanda', 'Dhobaura'],
  Jamalpur: ['Jamalpur Sadar', 'Bakshiganj', 'Dewanganj', 'Islampur', 'Madarganj', 'Melandaha', 'Sarishabari'],
  Netrokona: ['Netrokona Sadar', 'Atpara', 'Barhatta', 'Durgapur', 'Kalmakanda', 'Kendua', 'Madan', 'Mohanganj', 'Purbadhala', 'Khaliajuri'],
  Sherpur: ['Sherpur Sadar', 'Jhenaigati', 'Nakla', 'Nalitabari', 'Sreebardi'],
};

export function getUpazilasForDistrict(district: string): string[] {
  if (!district) return [];
  // Normalize match
  const cleanName = district.replace(/\s*\(.*?\)/g, '').trim();
  const directMatch = BANGLADESH_UPAZILAS[cleanName] || BANGLADESH_UPAZILAS[district];
  if (directMatch) return directMatch;

  const foundKey = Object.keys(BANGLADESH_UPAZILAS).find(
    (k) => k.toLowerCase() === cleanName.toLowerCase() || k.toLowerCase() === district.toLowerCase()
  );
  if (foundKey) return BANGLADESH_UPAZILAS[foundKey];

  return ['Sadar', 'North Upazila', 'South Upazila', 'East Upazila', 'West Upazila'];
}
