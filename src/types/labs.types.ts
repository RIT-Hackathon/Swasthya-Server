export interface AddLabAssistantRequest {
  labHeadId: string; // ID of the Lab Head
  labId: string; // ID of the Lab
  name: string;
  email: string;
  phone: string;
}

export interface DeleteLabAssistantRequest {
  labHeadId: string; // ID of the Lab Head
  assistantId: string; // ID of the Lab Assistant to be deleted
}

export interface GetLabAssistantsRequest {
  labId: string;
  headId: string;
}

export interface GetAppointmentsRequest {
  labId: string;
  status: string;
}
