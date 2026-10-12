export const createNewApplicationFormData = (today = new Date()) => ({
  company_name: '',
  position: '',
  salary_range: '',
  location: '',
  application_date: new Date(today),
  status: '已投递',
  notes: '',
  job_url: '',
});
