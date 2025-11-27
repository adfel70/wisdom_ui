/**
 * Mock Database
 * Contains all mock databases, tables, and data for the application
 */

export const MOCK_DATABASES = [
  {
    id: 'db1',
    name: 'Sales Database',
    description: 'Contains sales transactions, inventory, and customer data',
    tables: [
      {
        id: 't1',
        name: 'Q3_Transactions',
        year: 2024,
        country: 'USA',
        categories: ['Finance', 'Retail'],
        count: 1240,
        indexingDate: '2024-09-30',
        columns: ['TransID', 'Client', 'Amount', 'Date', 'Region'],
        data: [
          { TransID: 'TX-9901', Client: 'Apex Corp', Amount: '$14,200', Date: '2024-09-01', Region: 'North-East' },
          { TransID: 'TX-9902', Client: 'Zenith LLC', Amount: '$4,500', Date: '2024-09-02', Region: 'West' },
          { TransID: 'TX-9903', Client: 'Apex Corp', Amount: '$2,100', Date: '2024-09-05', Region: 'North-East' },
          { TransID: 'TX-9904', Client: 'Nova Inc', Amount: '$55,000', Date: '2024-09-10', Region: 'South' },
          { TransID: 'TX-9905', Client: 'Stellar Co', Amount: '$8,750', Date: '2024-09-12', Region: 'Midwest' },
          { TransID: 'TX-9906', Client: 'Zenith LLC', Amount: '$12,300', Date: '2024-09-15', Region: 'West' },
          { TransID: 'TX-9907', Client: 'Quantum Ltd', Amount: '$21,000', Date: '2024-09-18', Region: 'North-East' },
          { TransID: 'TX-9908', Client: 'Nova Inc', Amount: '$3,400', Date: '2024-09-20', Region: 'South' },
        ]
      },
      {
        id: 't2',
        name: 'Product_Inventory',
        year: 2024,
        country: 'USA',
        categories: ['Logistics'],
        count: 85,
        indexingDate: '2024-10-15',
        columns: ['SKU', 'ProductName', 'StockLevel', 'Warehouse', 'Supplier'],
        data: [
          { SKU: 'WID-A1', ProductName: 'Super Widget', StockLevel: '4,000', Warehouse: 'NY-01', Supplier: 'Global Mfg' },
          { SKU: 'GAD-B2', ProductName: 'Mega Gadget', StockLevel: '120', Warehouse: 'CA-05', Supplier: 'Tech Source' },
          { SKU: 'COM-C3', ProductName: 'Component X', StockLevel: '0', Warehouse: 'TX-02', Supplier: 'Global Mfg' },
          { SKU: 'WID-A2', ProductName: 'Ultra Widget', StockLevel: '2,500', Warehouse: 'NY-01', Supplier: 'Global Mfg' },
          { SKU: 'GAD-B3', ProductName: 'Mini Gadget', StockLevel: '850', Warehouse: 'CA-05', Supplier: 'Tech Source' },
          { SKU: 'COM-C4', ProductName: 'Component Y', StockLevel: '1,200', Warehouse: 'IL-03', Supplier: 'Parts Plus' },
        ]
      },
      {
        id: 't3',
        name: 'Customer_Accounts',
        year: 2024,
        country: 'USA',
        categories: ['Sales', 'CRM'],
        count: 456,
        indexingDate: '2024-11-01',
        columns: ['AccountID', 'CompanyName', 'Industry', 'Status', 'AccountManager'],
        data: [
          { AccountID: 'ACC-1001', CompanyName: 'Apex Corp', Industry: 'Technology', Status: 'Active', AccountManager: 'Sarah Johnson' },
          { AccountID: 'ACC-1002', CompanyName: 'Zenith LLC', Industry: 'Manufacturing', Status: 'Active', AccountManager: 'Mike Chen' },
          { AccountID: 'ACC-1003', CompanyName: 'Nova Inc', Industry: 'Healthcare', Status: 'Active', AccountManager: 'Emily Davis' },
          { AccountID: 'ACC-1004', CompanyName: 'Stellar Co', Industry: 'Finance', Status: 'Pending', AccountManager: 'James Wilson' },
          { AccountID: 'ACC-1005', CompanyName: 'Quantum Ltd', Industry: 'Technology', Status: 'Active', AccountManager: 'Sarah Johnson' },
        ]
      }
    ]
  },
  {
    id: 'db2',
    name: 'HR & Personnel',
    description: 'Human resources and employee management data',
    tables: [
      {
        id: 't4',
        name: 'Active_Employees',
        year: 2024,
        country: 'Global',
        categories: ['HR', 'Sensitive'],
        count: 4500,
        indexingDate: '2024-08-20',
        columns: ['EmpID', 'FullName', 'Title', 'Department', 'Email'],
        data: [
          { EmpID: 'E8821', FullName: 'Sarah Connor', Title: 'Security Lead', Department: 'Operations', Email: 's.connor@company.com' },
          { EmpID: 'E8822', FullName: 'Kyle Reese', Title: 'Consultant', Department: 'Tactical', Email: 'k.reese@company.com' },
          { EmpID: 'E8823', FullName: 'John Doe', Title: 'Analyst', Department: 'Finance', Email: 'j.doe@company.com' },
          { EmpID: 'E8824', FullName: 'Jane Smith', Title: 'Senior Developer', Department: 'Engineering', Email: 'j.smith@company.com' },
          { EmpID: 'E8825', FullName: 'Bob Williams', Title: 'Product Manager', Department: 'Product', Email: 'b.williams@company.com' },
          { EmpID: 'E8826', FullName: 'Alice Brown', Title: 'UX Designer', Department: 'Design', Email: 'a.brown@company.com' },
        ]
      },
      {
        id: 't5',
        name: 'Department_Budget',
        year: 2024,
        country: 'USA',
        categories: ['Finance', 'HR'],
        count: 25,
        indexingDate: '2024-07-10',
        columns: ['DeptID', 'DepartmentName', 'Budget', 'Spent', 'Remaining'],
        data: [
          { DeptID: 'D-001', DepartmentName: 'Engineering', Budget: '$2,500,000', Spent: '$1,800,000', Remaining: '$700,000' },
          { DeptID: 'D-002', DepartmentName: 'Operations', Budget: '$1,200,000', Spent: '$950,000', Remaining: '$250,000' },
          { DeptID: 'D-003', DepartmentName: 'Finance', Budget: '$800,000', Spent: '$600,000', Remaining: '$200,000' },
          { DeptID: 'D-004', DepartmentName: 'Product', Budget: '$1,500,000', Spent: '$1,100,000', Remaining: '$400,000' },
          { DeptID: 'D-005', DepartmentName: 'Design', Budget: '$600,000', Spent: '$420,000', Remaining: '$180,000' },
        ]
      },
      {
        id: 't6',
        name: 'Training_Programs',
        year: 2024,
        country: 'Global',
        categories: ['HR', 'Development'],
        count: 78,
        indexingDate: '2024-06-15',
        columns: ['ProgramID', 'ProgramName', 'Duration', 'Participants', 'Status'],
        data: [
          { ProgramID: 'TRN-501', ProgramName: 'Leadership Development', Duration: '6 weeks', Participants: '45', Status: 'Active' },
          { ProgramID: 'TRN-502', ProgramName: 'Technical Skills Workshop', Duration: '3 weeks', Participants: '120', Status: 'Active' },
          { ProgramID: 'TRN-503', ProgramName: 'Sales Excellence', Duration: '4 weeks', Participants: '32', Status: 'Completed' },
          { ProgramID: 'TRN-504', ProgramName: 'Project Management', Duration: '8 weeks', Participants: '67', Status: 'Active' },
        ]
      }
    ]
  },
  {
    id: 'db3',
    name: 'Marketing Analytics',
    description: 'Marketing campaigns, leads, and analytics data',
    tables: [
      {
        id: 't7',
        name: 'Campaign_Performance',
        year: 2024,
        country: 'Global',
        categories: ['Marketing', 'Analytics'],
        count: 156,
        indexingDate: '2024-10-20',
        columns: ['CampaignID', 'CampaignName', 'Channel', 'Impressions', 'Conversions'],
        data: [
          { CampaignID: 'CMP-2401', CampaignName: 'Summer Sale 2024', Channel: 'Email', Impressions: '450,000', Conversions: '12,500' },
          { CampaignID: 'CMP-2402', CampaignName: 'Product Launch Q3', Channel: 'Social Media', Impressions: '1,200,000', Conversions: '8,900' },
          { CampaignID: 'CMP-2403', CampaignName: 'Fall Promotion', Channel: 'Display Ads', Impressions: '800,000', Conversions: '5,400' },
          { CampaignID: 'CMP-2404', CampaignName: 'Holiday Special', Channel: 'Email', Impressions: '650,000', Conversions: '18,200' },
          { CampaignID: 'CMP-2405', CampaignName: 'Back to School', Channel: 'Search Ads', Impressions: '950,000', Conversions: '15,600' },
        ]
      },
      {
        id: 't8',
        name: 'Lead_Generation',
        year: 2024,
        country: 'USA',
        categories: ['Marketing', 'Sales'],
        count: 2340,
        indexingDate: '2024-11-15',
        columns: ['LeadID', 'CompanyName', 'Source', 'Score', 'Status'],
        data: [
          { LeadID: 'LD-8801', CompanyName: 'TechStart Inc', Source: 'Webinar', Score: '85', Status: 'Qualified' },
          { LeadID: 'LD-8802', CompanyName: 'InnoSolutions', Source: 'Trade Show', Score: '72', Status: 'Nurturing' },
          { LeadID: 'LD-8803', CompanyName: 'DataCorp', Source: 'Website', Score: '91', Status: 'Qualified' },
          { LeadID: 'LD-8804', CompanyName: 'CloudSystems', Source: 'Referral', Score: '88', Status: 'Contacted' },
          { LeadID: 'LD-8805', CompanyName: 'MobileTech', Source: 'Email Campaign', Score: '65', Status: 'New' },
        ]
      }
    ]
  },
  {
    id: 'db4',
    name: 'Legacy Archives',
    description: 'Historical data and archived records',
    tables: []
  }
];

/**
 * Get all unique years from all tables
 */
export const getAvailableYears = () => {
  const years = new Set();
  MOCK_DATABASES.forEach(db => {
    db.tables.forEach(table => {
      if (table.year) years.add(table.year);
    });
  });
  return Array.from(years).sort((a, b) => b - a);
};

/**
 * Get all unique categories from all tables
 */
export const getAvailableCategories = () => {
  const categories = new Set();
  MOCK_DATABASES.forEach(db => {
    db.tables.forEach(table => {
      table.categories.forEach(cat => categories.add(cat));
    });
  });
  return Array.from(categories).sort();
};

/**
 * Get all unique countries from all tables
 */
export const getAvailableCountries = () => {
  const countries = new Set();
  MOCK_DATABASES.forEach(db => {
    db.tables.forEach(table => {
      if (table.country) countries.add(table.country);
    });
  });
  return Array.from(countries).sort();
};

export default MOCK_DATABASES;
