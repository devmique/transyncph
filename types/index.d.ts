
export interface OperatorProfile {
    name: string
    email: string
    companyName: string
    phone: string
    city: string
    region: string
    tier: string
    status: string
  }
   
  export interface Announcement {
    _id?: string
    title: string
    message: string
    type: 'info' | 'warning' | 'alert'
    affectedRoutes: string[]
    createdAt?: Date
    companyName?: string  

  }

  export interface Route {
    _id?: string
    routeNumber: string
    startPoint: string
    endPoint: string
    distance: number
    estimatedTime: string
    companyName?: string      
    schedules?: Schedule[]
    startTerminalId?: string
    endTerminalId?: string
    startTerminal?: { _id: string; name: string; lat: number; lng: number }
    endTerminal?: { _id: string; name: string; lat: number; lng: number }
  }
  export interface Schedule {
    _id?: string
    routeId: string                  
    fare: number                   
    departureTime: string
    arrivalTime: string
    driverName: string
    vehicleNumber: string
    routeNumber?: string
    status: 'active' | 'inactive'
    /** Days this trip runs, 0 = Sunday (matches JS getDay()). Optional because
     *  schedules created before this field existed have no value; those are
     *  treated as running every day. */
    daysOfWeek?: number[]
    route?: {                      
      routeNumber: string
      startPoint: string
      endPoint: string
    }
  }
  

  export interface Terminal {
    _id?: string
    name: string
    location: string
    lat: number
    lng: number
    facilities?: string[]
  }
  
  export type ActivityKind = 'announcement' | 'route' | 'schedule' | 'terminal'

  export type ActivityItem = {
    key: string
    /** Which collection the record came from, so the log can be filtered. */
    kind: ActivityKind
    label: string
    time: string
    tsMs: number
  }
  
  type AnyDoc = Record<string, any>
  
  export interface LiveBus {
    scheduleId: string
    lat: number
    lng: number
    vehicleNumber?: string
    routeNumber?: string
    companyName?: string
  }
