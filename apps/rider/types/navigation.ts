import type { Delivery } from './delivery';

export type RootStackParamList = {
    Home: undefined;
    DeliveryDetails:
        | { delivery: Delivery; deliveryId?: Delivery['id'] }
        | { deliveryId: Delivery['id']; delivery?: Delivery };
    ActiveDelivery:
        | { job: Delivery; jobId?: Delivery['id'] }
        | { jobId: Delivery['id']; job?: Delivery };
    AvailableJobs: undefined;
    AssignedDeliveries: undefined;
    ProofOfDelivery: { jobId?: Delivery['id'] } | undefined;
    ReceiptUpload: undefined;
    JobHistory: undefined;
    Profile: undefined;
    Login: undefined;
};
