export default interface Database {
  polygons: {
    id?: number;
    type: string;
    polygon: any;
    elevation?: number;
    project_id: number;
  };
  projects: {
    id?: number;
    name: string;
  };
}
