async function search(){
  const params = {
    title: state.q,
    limit: state.limit,
    offset: state.offset,
    'order[relevance]': 'desc',
    includes: ['cover_art']
  };
  const { data } = await axios.get(`${API}/manga`, { params });
  const items = data?.data ?? [];
  state.total = data?.total ?? items.length;
  render(items);
  updatePager();
}