export interface Employee {
    user_id: string;
    username: string;
    employee: {
        name: string;           // from employee.name
        email: string;          // from employee.email
        phone: string;          // from employee.phone
        is_active: boolean;     // from employee.is_active
        nic: string;
        gender: string;
        dob: string;
    };
    role: {
        name: string;
    };
}
